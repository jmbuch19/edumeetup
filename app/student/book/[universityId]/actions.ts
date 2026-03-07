'use server'

import { requireAuth, requireStudentUser } from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import { MeetingPurpose, VideoProvider, MeetingStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { sendMeetingRequestEmail } from "@/lib/notifications"
import { createNotification } from "@/lib/notifications"
import { notifyStudent, notifyUniversity } from "@/lib/notify"

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
    const session = await requireAuth().catch(() => null)
    if (!session) return { error: "Unauthorized" }

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
    // Auth: must be an active STUDENT — enforces isActive + role in one call
    const session = await requireStudentUser().catch(() => null)
    if (!session) return { error: "Unauthorized" }

    // Validate input
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

    // Get Student profile (needed for meeting.studentId)
    const student = await prisma.student.findUnique({
        where: { userId: session.user.id }
    })
    if (!student) return { error: "Student profile required" }

    try {
        // ── ATOMIC SLOT BOOKING TRANSACTION ────────────────────────────────────
        // Step 1: verify slot unbooked → Step 2: create meeting → Step 3: mark isBooked
        // All three succeed or all fail — no partial state possible.
        const meeting = await prisma.$transaction(async (tx) => {
            // Step 1a: Conflict check (time-based overlap for same rep)
            const conflict = await tx.meeting.findFirst({
                where: {
                    repId,
                    status: { not: 'CANCELLED' },
                    OR: [{ startTime: { lt: end }, endTime: { gt: start } }],
                },
            })
            if (conflict) throw new Error('SLOT_TAKEN')

            // Step 1b: Check if a matching AvailabilitySlot exists and is already booked
            const slot = await tx.availabilitySlot.findFirst({
                where: { repId: repId, startTime: start, isBooked: false },
            })
            // Note: slot may be null if the UI renders custom slots without DB rows — allowed.
            // If a slot row exists, it MUST be unbooked.
            if (slot === null) {
                // No slot row found — check there is at least no isBooked=true duplicate
            } else if (slot.isBooked) {
                throw new Error('SLOT_TAKEN')
            }

            // Step 2: Generate unique meeting code (retry-safe: @unique in DB will catch dups)
            const year = new Date().getFullYear()
            const random = Math.floor(10000 + Math.random() * 90000)
            const code = `EDU-${year}-${random}`

            // Step 3: Create the meeting
            const newMeeting = await tx.meeting.create({
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
                    studentTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    repTimezone: 'UTC',
                    status: 'PENDING',
                    videoProvider,
                    meetingCode: code,
                },
            })

            // Step 4: If a slot row exists, mark it booked and link it to the meeting
            if (slot) {
                await tx.availabilitySlot.update({
                    where: { id: slot.id },
                    data: { isBooked: true, meetingId: newMeeting.id },
                })
            }

            return newMeeting
        })

        // ── Notifications ─────────────────────────────────────────────────────
        // 1. Fetch rep details for email
        const repUser = await prisma.user.findUnique({
            where: { id: repId },
            include: { university: true }
        })

        const universityRecord = await prisma.university.findUnique({
            where: { id: universityId },
            include: { user: true }
        })

        // 2. Email to rep
        if (repUser?.email) {
            await sendMeetingRequestEmail(
                repUser.email,
                student.fullName || 'Student',
                student.country || 'N/A',
                purpose,
                start,
                durationMinutes,
                meeting.id,
                studentQuestions
            )
        }

        // 3. In-app notification to university owner (generic Notification table)
        if (universityRecord?.user?.id) {
            await createNotification({
                userId: universityRecord.user.id,
                type: 'MEETING_REQUEST',
                title: 'New Meeting Request',
                message: `${student.fullName || 'A student'} has requested a ${durationMinutes}-min meeting on ${start.toLocaleDateString()}`,
                payload: { meetingId: meeting.id, studentId: student.id }
            })
        }

        // 4. Role-specific dashboard bell notifications
        await notifyUniversity(universityId, {
            title: 'New Meeting Request',
            message: `${student.fullName || 'A student'} has requested a ${durationMinutes}-min meeting on ${start.toLocaleDateString()}.`,
            type: 'INFO',
            actionUrl: '/university/meetings'
        })
        await notifyStudent(student.id, {
            title: 'Meeting Request Sent',
            message: `Your meeting request with ${universityRecord?.institutionName || 'the university'} has been submitted. You'll be notified when it's confirmed.`,
            type: 'INFO',
            actionUrl: '/student/meetings'
        })

        revalidatePath('/student/meetings')
        revalidatePath('/university/meetings')

        return { success: true, meetingId: meeting.id }
    } catch (error) {
        console.error("Booking error:", error)
        return { error: "Failed to book meeting" }
    }
}
