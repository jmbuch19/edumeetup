'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { MeetingPurpose, VideoProvider, MeetingStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// --- Schema Validation ---

const bookingSchema = z.object({
    universityId: z.string(),
    repId: z.string(),
    programId: z.string().optional(),
    purpose: z.nativeEnum(MeetingPurpose),
    studentQuestions: z.string().max(1000).optional(),
    durationMinutes: z.number().refine(val => [10, 15, 20].includes(val)),
    startTime: z.string().datetime(), // ISO string
    videoProvider: z.nativeEnum(VideoProvider),
    audioOnly: z.boolean().default(false)
})

export type BookingData = z.infer<typeof bookingSchema>

// --- Actions ---

export async function getBookingData(universityId: string) {
    const session = await auth()
    if (!session || !session.user) return { error: "Unauthorized" }

    // 1. Fetch University & Reps
    const university = await prisma.university.findUnique({
        where: { id: universityId },
        include: {
            user: { select: { name: true, image: true } }, // University generic user
            availabilityProfiles: {
                where: { isActive: true },
                include: {
                    repUser: {
                        select: { id: true, name: true, image: true } // Fetch specific rep details
                    }
                }
            },
            programs: {
                select: { id: true, programName: true, degreeLevel: true }
            }
        }
    })

    if (!university) return { error: "University not found" }

    // 2. Fetch Existing Bookings (to block occupied slots)
    // We only need bookings that significantly overlap with the future.
    // Optimization: Fetch bookings from NOW onwards.
    const now = new Date()
    const existingBookings = await prisma.meeting.findMany({
        where: {
            universityId: universityId,
            startTime: { gte: now },
            status: { not: 'CANCELLED' }
        },
        select: {
            startTime: true,
            endTime: true,
            repId: true
        }
    })

    return {
        university,
        existingBookings
    }
}

export async function createMeetingRequest(data: BookingData) {
    const session = await auth()
    if (!session || !session.user) return { error: "Unauthorized" }

    // Validate
    const parsed = bookingSchema.safeParse(data)
    if (!parsed.success) {
        return { error: "Invalid data", details: parsed.error.flatten() }
    }

    const {
        universityId, repId, programId, purpose, studentQuestions,
        durationMinutes, startTime, videoProvider
    } = parsed.data

    const start = new Date(startTime)
    const end = new Date(start.getTime() + durationMinutes * 60000)

    try {
        // Double-check availability (race condition prevention)
        const conflict = await prisma.meeting.findFirst({
            where: {
                repId,
                status: { not: 'CANCELLED' },
                OR: [
                    { startTime: { lt: end }, endTime: { gt: start } } // Overlap logic
                ]
            }
        })

        if (conflict) {
            return { error: "This slot was just taken. Please choose another." }
        }

        // Get Student Profile ID
        const student = await prisma.student.findUnique({
            where: { userId: session.user.id }
        })

        if (!student) return { error: "Student profile required" }

        // Find Rep's timezone (optional, fallback to UTC or University logic)
        // For MVP we might just store what we have or fetch user again.
        // Let's assume 'UTC' for simplicity in backend, but spec asks for it.
        // We'll leave timezone calculation to the frontend (submitted data?) or default.
        // Spec: "student_timezone", "rep_timezone". 
        // We'll default these for now if not passed. 
        // Note: Schema has `studentTimezone` and `repTimezone`.

        // Generate Meeting Code
        const year = new Date().getFullYear()
        const random = Math.floor(10000 + Math.random() * 90000)
        const code = `EDU-${year}-${random}`

        // Create Meeting
        const meeting = await prisma.meeting.create({
            data: {
                studentId: student.id,
                universityId,
                repId,
                programId,
                purpose,
                studentQuestions,
                durationMinutes,
                startTime: start,
                endTime: end,
                studentTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Server side might correspond to server locale, ideally pass from client
                repTimezone: 'UTC', // Placeholder
                status: 'PENDING', // Or CONFIRMED if instant-book
                videoProvider,
                meetingCode: code,
                // If External Link, we should fetch it from AvailabilityProfile
                // We can do that in a "connect" step or just let it be null until confirmed.
            }
        })

        // Send Email Notification (TODO in Phase D)

        revalidatePath('/student/meetings')
        revalidatePath('/university/meetings')

        return { success: true, meetingId: meeting.id }
    } catch (error) {
        console.error("Booking error:", error)
        return { error: "Failed to book meeting" }
    }
}
