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

// ─── Input Schema ──────────────────────────────────────────────────────────────

const VALID_DURATIONS = [10, 15, 20] as const

const bookingSchema = z.object({
    universityId: z.string().cuid(),
    repId: z.string().cuid(),
    // slotId: DB primary key of the AvailabilitySlot chosen by the student.
    // The server validates ownership, availability, and timing by ID.
    // startTime is retained for pre-flight lead-time checks only;
    // authoritative times come from the slot row itself.
    slotId: z.string().cuid(),
    programId: z.string().cuid().optional(),
    purpose: z.nativeEnum(MeetingPurpose),
    studentQuestions: z.string().max(1000).optional(),
    durationMinutes: z.number().refine(
        val => (VALID_DURATIONS as readonly number[]).includes(val),
        { message: `Duration must be one of: ${VALID_DURATIONS.join(', ')} minutes` }
    ),
    startTime: z.string().datetime(),   // ISO 8601 — display/lead-time check only
    videoProvider: z.nativeEnum(VideoProvider),
    audioOnly: z.boolean().default(false),
    // Client-supplied IANA timezone — validated server-side.
    // Never use the server runtime timezone as the student timezone.
    studentTimezone: z.string().min(1).max(100).refine(
        tz => { try { Intl.DateTimeFormat(undefined, { timeZone: tz }); return true } catch { return false } },
        { message: 'Invalid IANA timezone' }
    ),
})

export type BookingData = z.infer<typeof bookingSchema>

// ─── Meeting Code Generator ────────────────────────────────────────────────────
// 4 random bytes = 8 hex chars = 2^32 space — collision-resistant without retry.

function generateMeetingCode(): string {
    return `EDU-${new Date().getFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`
}

// ─── Read ──────────────────────────────────────────────────────────────────────

export async function getBookingData(universityId: string) {
    // Only active students may access booking data (not reps, not admins).
    const session = await requireStudentUser().catch(() => null)
    if (!session) return { error: "Unauthorized" }

    const university = await prisma.university.findUnique({
        where: { id: universityId },
        include: {
            user: { select: { name: true, image: true } },  // owner via User.university
            availabilityProfiles: {
                where: { isActive: true },
                include: { repUser: { select: { id: true, name: true, image: true } } },
            },
            programs: { select: { id: true, programName: true, degreeLevel: true } },
        },
    })
    if (!university) return { error: "University not found" }

    const existingBookings = await prisma.meeting.findMany({
        where: { universityId, startTime: { gte: new Date() }, status: { not: 'CANCELLED' } },
        select: { startTime: true, endTime: true, repId: true },
    })

    // SLOT-BASED BOOKING: expose real AvailabilitySlot rows with IDs.
    // Client selects a slot and submits slotId. Server books by ID — not by
    // fragile timestamp matching.
    const availableSlots = await prisma.availabilitySlot.findMany({
        where: { universityId, startTime: { gte: new Date() }, isBooked: false, meetingId: null },
        select: { id: true, repId: true, startTime: true, endTime: true },
        orderBy: { startTime: 'asc' },
    })

    return { university, existingBookings, availableSlots }
}

// ─── Write ─────────────────────────────────────────────────────────────────────

export async function createMeetingRequest(data: BookingData) {
    const session = await requireStudentUser().catch(() => null)
    if (!session) return { error: "Unauthorized" }

    const parsed = bookingSchema.safeParse(data)
    if (!parsed.success) return { error: "Invalid request", details: parsed.error.flatten() }

    const {
        universityId, repId, slotId, programId, purpose, studentQuestions,
        durationMinutes, startTime, videoProvider, studentTimezone,
    } = parsed.data

    const start = new Date(startTime)
    const now = new Date()

    // ── Pre-flight checks (fast, outside transaction) ────────────────────────

    // [1a] University existence
    const university = await prisma.university.findUnique({
        where: { id: universityId },
        select: { id: true, userId: true, institutionName: true },
    })
    if (!university) return { error: "University not found" }

    // [1b] Rep: exists, active, UNIVERSITY_REP role, belongs to this university.
    // User.representedUniversity is the rep membership relation.
    const rep = await prisma.user.findUnique({
        where: { id: repId },
        select: { id: true, isActive: true, role: true, representedUniversity: { select: { id: true } } },
    })
    if (!rep) return { error: "Representative not found" }
    if (!rep.isActive) return { error: "Representative account is no longer active" }
    if (rep.role !== 'UNIVERSITY_REP') return { error: "The selected user is not a valid university representative" }
    if (rep.representedUniversity?.id !== universityId) return { error: "Representative does not belong to this university" }

    // [2] Program cross-university check
    if (programId) {
        const program = await prisma.program.findUnique({ where: { id: programId }, select: { universityId: true } })
        if (!program || program.universityId !== universityId) return { error: "Program does not belong to this university" }
    }

    // [3] Availability policy enforcement
    //
    // TIMEZONE POLICY (canonical and documented):
    //   AvailabilityProfile.timezone = the rep's scheduling timezone (e.g. "Asia/Kolkata").
    //   dayOfWeek and startTime/endTime strings on AvailabilityProfile are expressed
    //   in this timezone — NOT in UTC, NOT in studentTimezone.
    //   Booking validation converts the client UTC startTime into profile.timezone before
    //   comparing day-of-week and HH:MM window.
    //
    //   Meeting.startTime/endTime   = UTC instants (Postgres timestamptz).
    //   Meeting.studentTimezone     = client-supplied IANA (display only, not used for validation).
    //   Meeting.repTimezone         = profile.timezone (the timezone used during validation).

    // First pass: get the scheduling timezone from any active profile for this rep.
    const profileRaw = await prisma.availabilityProfile.findFirst({
        where: { universityId, repId, isActive: true },
        select: { timezone: true },
    })
    if (!profileRaw) return { error: 'No active availability profile found for this rep' }

    const schedTZ = profileRaw.timezone  // e.g. "Asia/Kolkata", "America/New_York", "UTC"

    // Convert UTC instant → rep's scheduling timezone for day/time derivation.
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: schedTZ, weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(start)

    const repWeekday = (parts.find(p => p.type === 'weekday')?.value ?? '').toUpperCase() as
        'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
    const repHour = parts.find(p => p.type === 'hour')?.value ?? '00'
    const repMinute = parts.find(p => p.type === 'minute')?.value ?? '00'
    const requestedHHMM = `${repHour}:${repMinute}`  // zero-padded "HH:MM" in schedTZ

    // Full profile for the derived day-of-week
    const profile = await prisma.availabilityProfile.findFirst({
        where: { universityId, repId, isActive: true, dayOfWeek: repWeekday },
    })
    if (!profile) return { error: `No availability configured for ${repWeekday} in ${schedTZ}` }

    // [3a] Duration allowed
    if (!profile.meetingDurationOptions.includes(durationMinutes)) {
        return { error: `${durationMinutes} min not offered — allowed: ${profile.meetingDurationOptions.join(', ')} min` }
    }

    // [3b] Time within window (HH:MM comparison — safe because normalizeHHMM() is enforced on writes)
    if (requestedHHMM < profile.startTime || requestedHHMM >= profile.endTime) {
        return { error: `Requested time (${requestedHHMM} ${schedTZ}) outside availability (${profile.startTime}–${profile.endTime} ${schedTZ})` }
    }

    // [3c] Lead time
    if (start.getTime() - now.getTime() < profile.minLeadTimeHours * 3_600_000) {
        return { error: `Must book at least ${profile.minLeadTimeHours}h in advance` }
    }

    // [3d] Daily cap — computed from the rep's local calendar date, not UTC date.
    // e.g. 23:30 UTC = next day in IST; cap must count against the rep's local day.
    const repDateStr = start.toLocaleDateString('en-CA', { timeZone: schedTZ }) // "YYYY-MM-DD"
    const [y, mo, d] = repDateStr.split('-').map(Number)
    const dayStart = new Date(Date.UTC(y, mo - 1, d, 0, 0, 0, 0))
    const dayEnd = new Date(Date.UTC(y, mo - 1, d, 23, 59, 59, 999))
    const todayCount = await prisma.meeting.count({
        where: { repId, status: { not: 'CANCELLED' }, startTime: { gte: dayStart, lte: dayEnd } },
    })
    if (todayCount >= profile.dailyCap) {
        return { error: `Daily cap of ${profile.dailyCap} meetings reached for this rep` }
    }

    // Student profile (scoped to session user — never from client input)
    const student = await prisma.student.findUnique({ where: { userId: session.user.id } })
    if (!student) return { error: "Student profile required" }

    try {
        // ── SLOT SELECTION POLICY ───────────────────────────────────────────────────
        // Client submits slotId (the DB primary key of an AvailabilitySlot row).
        // Server fetches slot by ID, validates rep/university ownership and free state.
        // Authoritative startTime/endTime come from the slot row — never from client input.
        //
        // ── ATOMIC TRANSACTION ──────────────────────────────────────────────────────
        // Step 1: Fetch slot by ID → validate ownership + availability
        // Step 2: Time-overlap conflict check (belt-and-suspenders)
        // Step 3: Create meeting with authoritative slot times
        // Step 4: Lock slot (isBooked=true, meetingId=newMeeting.id)
        // All succeed or all roll back.

        const meeting = await prisma.$transaction(async (tx) => {

            // Step 1: Fetch slot by ID — no timestamp fragility
            const slot = await tx.availabilitySlot.findUnique({ where: { id: slotId } })
            if (!slot) throw new Error('NO_SLOT')
            if (slot.repId !== repId) throw new Error('SLOT_MISMATCH')
            if (slot.universityId !== universityId) throw new Error('SLOT_MISMATCH')
            if (slot.isBooked || slot.meetingId) throw new Error('SLOT_TAKEN')

            // Authoritative times from slot row (not client-supplied)
            const slotStart = slot.startTime
            const slotEnd = slot.endTime

            // Step 2: Overlap check (belt-and-suspenders)
            const conflict = await tx.meeting.findFirst({
                where: {
                    repId,
                    status: { not: 'CANCELLED' },
                    OR: [{ startTime: { lt: slotEnd }, endTime: { gt: slotStart } }],
                },
            })
            if (conflict) throw new Error('SLOT_TAKEN')

            // Step 3: Create meeting with authoritative times
            const newMeeting = await tx.meeting.create({
                data: {
                    studentId: student!.id,
                    universityId, repId, programId, purpose, studentQuestions,
                    durationMinutes,
                    startTime: slotStart,           // from slot row
                    endTime: slotEnd,              // from slot row
                    studentTimezone,                      // client-supplied, IANA-validated
                    repTimezone: profile.timezone,    // canonical schedule timezone
                    status: 'PENDING',
                    videoProvider,
                    meetingCode: generateMeetingCode(),
                },
            })

            // Step 4: Lock slot atomically
            await tx.availabilitySlot.update({
                where: { id: slot.id },
                data: { isBooked: true, meetingId: newMeeting.id },
            })

            return newMeeting
        })

        // ── Notifications (outside transaction — failures must not roll back the booking) ──

        // University owner: User.university relation (not User.representedUniversity)
        const universityRecord = await prisma.university.findUnique({
            where: { id: universityId },
            include: { user: true },
        })

        const repUser = await prisma.user.findUnique({ where: { id: repId }, select: { email: true } })
        if (repUser?.email) {
            await sendMeetingRequestEmail(
                repUser.email,
                student!.fullName || 'Student',
                student!.country || 'N/A',
                purpose,
                meeting.startTime,
                durationMinutes,
                meeting.id,
                studentQuestions
            )
        }

        if (universityRecord?.user?.id) {
            await createNotification({
                userId: universityRecord.user.id,
                type: 'MEETING_REQUEST',
                title: 'New Meeting Request',
                message: `${student!.fullName || 'A student'} requested a ${durationMinutes}-min meeting on ${meeting.startTime.toLocaleDateString()}`,
                payload: { meetingId: meeting.id, studentId: student!.id },
            })
        }

        await notifyUniversity(universityId, {
            title: 'New Meeting Request',
            message: `${student!.fullName || 'A student'} requested a ${durationMinutes}-min meeting on ${meeting.startTime.toLocaleDateString()}.`,
            type: 'INFO',
            actionUrl: '/university/meetings',
        })
        await notifyStudent(student!.id, {
            title: 'Meeting Request Sent',
            message: `Your request with ${universityRecord?.institutionName || 'the university'} has been submitted. You will be notified when confirmed.`,
            type: 'INFO',
            actionUrl: '/student/meetings',
        })

        revalidatePath('/student/meetings')
        revalidatePath('/university/meetings')

        return { success: true, meetingId: meeting.id }

    } catch (error: any) {
        if (error?.message === 'SLOT_TAKEN') return { error: "This slot was just taken. Please choose another time." }
        if (error?.message === 'NO_SLOT') return { error: "No available slot found. Please select a different slot." }
        if (error?.message === 'SLOT_MISMATCH') return { error: "Invalid slot selection. Please refresh and try again." }
        console.error("[Meeting Booking]", error)
        return { error: "Failed to book meeting. Please try again." }
    }
}
