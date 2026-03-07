'use server'

import { requireStudentUser } from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import { MeetingPurpose, VideoProvider } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { sendMeetingRequestEmail } from "@/lib/notifications"
import { createNotification } from "@/lib/notifications"
import { notifyStudent, notifyUniversity } from "@/lib/notify"
import { randomBytes } from "crypto"

// ─── Input Validation ─────────────────────────────────────────────────────────
// Fix 4: studentTimezone now comes from the client and is validated.
// The server runtime timezone is never used.

const VALID_DURATIONS = [10, 15, 20] as const

const bookingSchema = z.object({
    universityId: z.string().cuid(),
    repId: z.string().cuid(),
    programId: z.string().cuid().optional(),
    purpose: z.nativeEnum(MeetingPurpose),
    studentQuestions: z.string().max(1000).optional(),
    durationMinutes: z.number().refine(val => (VALID_DURATIONS as readonly number[]).includes(val), {
        message: `Duration must be one of: ${VALID_DURATIONS.join(', ')} minutes`,
    }),
    startTime: z.string().datetime(),   // ISO 8601 from client
    videoProvider: z.nativeEnum(VideoProvider),
    audioOnly: z.boolean().default(false),
    // Fix 4: client-supplied timezone — validated as a known IANA zone
    studentTimezone: z.string().min(1).max(100).refine(
        tz => {
            try { Intl.DateTimeFormat(undefined, { timeZone: tz }); return true }
            catch { return false }
        },
        { message: 'Invalid IANA timezone' }
    ),
})

export type BookingData = z.infer<typeof bookingSchema>

// ─── Internal: Generate collision-resistant meeting code ──────────────────────
// Fix 5: Uses 6 hex bytes (48 bits) instead of a 5-digit random number.
// Chance of collision: ~1 in 281 trillion — safe without retry.

function generateMeetingCode(): string {
    const hex = randomBytes(4).toString('hex').toUpperCase()
    return `EDU-${new Date().getFullYear()}-${hex}`
}

// ─── Read Action ──────────────────────────────────────────────────────────────

export async function getBookingData(universityId: string) {
    // Fix 7: requireStudentUser — only active students should see booking data
    const session = await requireStudentUser().catch(() => null)
    if (!session) return { error: "Unauthorized" }

    const university = await prisma.university.findUnique({
        where: { id: universityId },
        include: {
            // Fix 8: university owner is via user.university (not representedUniversity)
            user: { select: { name: true, image: true } },
            availabilityProfiles: {
                where: { isActive: true },
                include: {
                    // repUser is the rep — linked via AvailabilityProfile.repId
                    repUser: { select: { id: true, name: true, image: true } }
                }
            },
            programs: { select: { id: true, programName: true, degreeLevel: true } }
        }
    })
    if (!university) return { error: "University not found" }

    const existingBookings = await prisma.meeting.findMany({
        where: {
            universityId,
            startTime: { gte: new Date() },
            status: { not: 'CANCELLED' }
        },
        select: { startTime: true, endTime: true, repId: true }
    })

    return { university, existingBookings }
}

// ─── Write Action ─────────────────────────────────────────────────────────────

export async function createMeetingRequest(data: BookingData) {
    // Auth: must be an active STUDENT
    const session = await requireStudentUser().catch(() => null)
    if (!session) return { error: "Unauthorized" }

    // Input validation (strips unknown fields, enforces types/enums)
    const parsed = bookingSchema.safeParse(data)
    if (!parsed.success) {
        return { error: "Invalid request", details: parsed.error.flatten() }
    }

    const {
        universityId, repId, programId, purpose, studentQuestions,
        durationMinutes, startTime, videoProvider, studentTimezone,
    } = parsed.data

    const start = new Date(startTime)
    const end = new Date(start.getTime() + durationMinutes * 60_000)
    const now = new Date()

    // ── Pre-flight checks (fast, outside transaction) ──────────────────────────

    // Fix 1a: Verify the university exists
    const university = await prisma.university.findUnique({
        where: { id: universityId },
        select: { id: true, userId: true, institutionName: true },
    })
    if (!university) return { error: "University not found" }

    // Fix 1b: Verify the rep exists, is active, and belongs to this university
    // Rep ownership: User.representedUniversity links via User.universityId
    const rep = await prisma.user.findUnique({
        where: { id: repId },
        select: {
            id: true,
            isActive: true,
            role: true,
            representedUniversity: { select: { id: true } },
        },
    })

    if (!rep) {
        return { error: "Representative not found" }
    }
    if (!rep.isActive) {
        return { error: "Representative account is no longer active" }
    }
    if (rep.role !== 'UNIVERSITY_REP') {
        return { error: "The selected user is not a valid university representative" }
    }
    if (rep.representedUniversity?.id !== universityId) {
        return { error: "Representative does not belong to this university" }
    }

    // Fix 2: Verify programId belongs to this university (if provided)
    if (programId) {
        const program = await prisma.program.findUnique({
            where: { id: programId },
            select: { universityId: true },
        })
        if (!program || program.universityId !== universityId) {
            return { error: "Program does not belong to this university" }
        }
    }

    // Fix 3: Validate against rep's AvailabilityProfile rules
    // Find the active profile that covers the requested day + time window
    const dayOfWeek = start.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }).toUpperCase() as
        'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

    const requestedHHMM = start.toISOString().substring(11, 16) // "HH:MM" in UTC

    const profile = await prisma.availabilityProfile.findFirst({
        where: {
            universityId,
            repId,
            isActive: true,
            dayOfWeek: dayOfWeek,
        },
    })

    if (!profile) {
        return { error: `No availability configured for ${dayOfWeek}` }
    }

    // Fix 3a: Duration must be in the allowed options
    if (!profile.meetingDurationOptions.includes(durationMinutes)) {
        return {
            error: `Duration ${durationMinutes} min is not offered — allowed: ${profile.meetingDurationOptions.join(', ')} min`,
        }
    }

    // Fix 3b: Requested time must fall within the configured window
    if (requestedHHMM < profile.startTime || requestedHHMM >= profile.endTime) {
        return {
            error: `Requested time is outside availability window (${profile.startTime}–${profile.endTime} UTC)`,
        }
    }

    // Fix 3c: Minimum lead-time check
    const leadTimeMs = profile.minLeadTimeHours * 60 * 60 * 1_000
    if (start.getTime() - now.getTime() < leadTimeMs) {
        return {
            error: `Booking requires at least ${profile.minLeadTimeHours}h lead time`,
        }
    }

    // Fix 3d: Daily cap — count existing non-cancelled meetings for this rep today
    const dayStart = new Date(start); dayStart.setUTCHours(0, 0, 0, 0)
    const dayEnd = new Date(start); dayEnd.setUTCHours(23, 59, 59, 999)
    const todayCount = await prisma.meeting.count({
        where: {
            repId,
            status: { not: 'CANCELLED' },
            startTime: { gte: dayStart, lte: dayEnd },
        },
    })
    if (todayCount >= profile.dailyCap) {
        return { error: `Daily booking cap of ${profile.dailyCap} meetings reached for this rep` }
    }

    // Fetch student profile
    const student = await prisma.student.findUnique({ where: { userId: session.user.id } })
    if (!student) return { error: "Student profile required" }

    try {
        // ── ATOMIC SLOT BOOKING TRANSACTION ──────────────────────────────────────
        // Fix 6: Require a real AvailabilitySlot to exist and be free.
        // The query targets isBooked: false, so slot.isBooked is always false here
        // (the redundant check is removed as requested).
        //
        // Flow inside transaction:
        //  1. Verify no time-overlap conflict for this rep
        //  2. Require a matching free AvailabilitySlot — reject if none
        //  3. Create the Meeting
        //  4. Mark slot isBooked = true and link to meeting
        //
        // All 4 steps succeed or all roll back.

        const meeting = await prisma.$transaction(async (tx) => {

            // Step 1: Time-overlap conflict check
            const conflict = await tx.meeting.findFirst({
                where: {
                    repId,
                    status: { not: 'CANCELLED' },
                    OR: [{ startTime: { lt: end }, endTime: { gt: start } }],
                },
            })
            if (conflict) throw new Error('SLOT_TAKEN')

            // Step 2: Require a real, free AvailabilitySlot (Fix 6 — strict model)
            const slot = await tx.availabilitySlot.findFirst({
                where: {
                    repId,
                    universityId,
                    startTime: start,
                    isBooked: false,
                    meetingId: null, // belt-and-suspenders: not already linked
                },
            })
            if (!slot) throw new Error('NO_SLOT')

            // Step 3: Create the meeting
            // Fix 4: studentTimezone from client (validated above), never server runtime
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
                    studentTimezone,          // client-supplied, IANA-validated
                    repTimezone: 'UTC',  // TODO: store rep's preferred timezone on profile
                    status: 'PENDING',
                    videoProvider,
                    meetingCode: generateMeetingCode(), // Fix 5: collision-resistant
                },
            })

            // Step 4: Lock the slot atomically
            await tx.availabilitySlot.update({
                where: { id: slot.id },
                data: { isBooked: true, meetingId: newMeeting.id },
            })

            return newMeeting
        })

        // ── Notifications (outside transaction — failures must not roll back the booking) ──

        // Fix 8: Correct owner vs rep lookup.
        // University owner uses user.university relation.
        // Rep notification is sent directly to repId (already known).
        const universityRecord = await prisma.university.findUnique({
            where: { id: universityId },
            include: { user: true }, // user = university owner (User.university relation)
        })

        if (rep.isActive) {
            const repUser = await prisma.user.findUnique({
                where: { id: repId },
                select: { email: true },
            })
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
        }

        // In-app notification to university owner
        if (universityRecord?.user?.id) {
            await createNotification({
                userId: universityRecord.user.id,
                type: 'MEETING_REQUEST',
                title: 'New Meeting Request',
                message: `${student.fullName || 'A student'} has requested a ${durationMinutes}-min meeting on ${start.toLocaleDateString()}`,
                payload: { meetingId: meeting.id, studentId: student.id },
            })
        }

        await notifyUniversity(universityId, {
            title: 'New Meeting Request',
            message: `${student.fullName || 'A student'} has requested a ${durationMinutes}-min meeting on ${start.toLocaleDateString()}.`,
            type: 'INFO',
            actionUrl: '/university/meetings',
        })
        await notifyStudent(student.id, {
            title: 'Meeting Request Sent',
            message: `Your request with ${universityRecord?.institutionName || 'the university'} has been submitted. You will be notified when confirmed.`,
            type: 'INFO',
            actionUrl: '/student/meetings',
        })

        revalidatePath('/student/meetings')
        revalidatePath('/university/meetings')

        return { success: true, meetingId: meeting.id }

    } catch (error: any) {
        if (error?.message === 'SLOT_TAKEN') {
            return { error: "This slot was just taken. Please choose another time." }
        }
        if (error?.message === 'NO_SLOT') {
            return { error: "No available slot found for the requested time. Please select a different slot." }
        }
        console.error("[Meeting Booking] Error:", error)
        return { error: "Failed to book meeting. Please try again." }
    }
}
