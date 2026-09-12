'use server'

import { requireStudentUser } from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import { MeetingPurpose, Prisma, VideoProvider } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { sendMeetingRequestEmail, createNotification } from "@/lib/notifications"
import { notifyStudent, notifyUniversity } from "@/lib/notify"
import { randomBytes } from "crypto"

const VALID_DURATIONS = [10, 15, 20] as const

type Weekday = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

const bookingSchema = z.object({
    universityId: z.string().cuid(),
    repId: z.string().cuid(),
    slotId: z.string().cuid(),
    programId: z.string().cuid().optional(),
    purpose: z.nativeEnum(MeetingPurpose),
    studentQuestions: z.string().max(1000).optional(),
    durationMinutes: z.number().refine(
        val => (VALID_DURATIONS as readonly number[]).includes(val),
        { message: `Duration must be one of: ${VALID_DURATIONS.join(', ')} minutes` }
    ),
    startTime: z.string().datetime(),
    videoProvider: z.nativeEnum(VideoProvider),
    audioOnly: z.boolean().default(false),
    studentTimezone: z.string().min(1).max(100).refine(
        tz => { try { Intl.DateTimeFormat(undefined, { timeZone: tz }); return true } catch { return false } },
        { message: 'Invalid IANA timezone' }
    ),
})

export type BookingData = z.infer<typeof bookingSchema>

function generateMeetingCode(): string {
    return `EDU-${new Date().getFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`
}

function getZonedDateParts(date: Date, timeZone: string) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric', month: '2-digit', day: '2-digit',
        weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(date)
    const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value ?? ''
    return {
        year: Number(get('year')),
        month: Number(get('month')),
        day: Number(get('day')),
        weekday: get('weekday').toUpperCase() as Weekday,
        hour: get('hour'),
        minute: get('minute'),
    }
}

/** Return the UTC instant corresponding to local midnight in an IANA timezone. */
function zonedMidnightUtc(year: number, month: number, day: number, timeZone: string): Date {
    let candidate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
    for (let i = 0; i < 3; i++) {
        const p = getZonedDateParts(candidate, timeZone)
        const localHour = p.hour === '24' ? 0 : Number(p.hour)
        const localMinute = Number(p.minute)
        const localAsUtc = Date.UTC(p.year, p.month - 1, p.day, localHour, localMinute, 0, 0)
        const targetAsUtc = Date.UTC(year, month - 1, day, 0, 0, 0, 0)
        const offsetMs = localAsUtc - targetAsUtc
        const corrected = new Date(candidate.getTime() - offsetMs)
        if (corrected.getTime() === candidate.getTime()) return corrected
        candidate = corrected
    }
    return candidate
}

function getZonedDayRangeUtc(date: Date, timeZone: string) {
    const p = getZonedDateParts(date, timeZone)
    const start = zonedMidnightUtc(p.year, p.month, p.day, timeZone)
    const nextDayNominal = new Date(Date.UTC(p.year, p.month - 1, p.day + 1, 0, 0, 0, 0))
    const next = getZonedDateParts(nextDayNominal, timeZone)
    const end = zonedMidnightUtc(next.year, next.month, next.day, timeZone)
    return { start, end }
}

export async function getBookingData(universityId: string) {
    const session = await requireStudentUser().catch(() => null)
    if (!session) return { error: "Unauthorized" }

    const university = await prisma.university.findUnique({
        where: { id: universityId },
        include: {
            user: { select: { name: true, image: true } },
            availabilityProfiles: {
                where: { isActive: true },
                include: { repUser: { select: { id: true, name: true, image: true } } },
            },
            programList: { select: { id: true, programName: true, degreeLevel: true } },
        },
    })
    if (!university) return { error: "University not found" }

    const existingBookings = await prisma.meeting.findMany({
        where: { universityId, startTime: { gte: new Date() }, status: { not: 'CANCELLED' } },
        select: { startTime: true, endTime: true, repId: true },
    })

    const availableSlots = await prisma.availabilitySlot.findMany({
        where: { universityId, startTime: { gte: new Date() }, isBooked: false, meetingId: null },
        select: { id: true, repId: true, startTime: true, endTime: true },
        orderBy: { startTime: 'asc' },
    })

    return { university, existingBookings, availableSlots }
}

export async function createMeetingRequest(data: BookingData) {
    const session = await requireStudentUser().catch(() => null)
    if (!session) return { error: "Unauthorized" }

    const parsed = bookingSchema.safeParse(data)
    if (!parsed.success) return { error: "Invalid request", details: parsed.error.flatten() }

    const {
        universityId, repId, slotId, programId, purpose, studentQuestions,
        durationMinutes, startTime, videoProvider, studentTimezone,
    } = parsed.data

    const clientStart = new Date(startTime)
    const now = new Date()

    const university = await prisma.university.findUnique({
        where: { id: universityId },
        select: { id: true, userId: true, institutionName: true },
    })
    if (!university) return { error: "University not found" }

    const rep = await prisma.user.findUnique({
        where: { id: repId },
        select: { id: true, isActive: true, role: true, representedUniversity: { select: { id: true } }, timezone: true },
    })
    if (!rep) return { error: "Representative not found" }
    if (!rep.isActive) return { error: "Representative account is no longer active" }
    if (rep.role !== 'UNIVERSITY_REP') return { error: "The selected user is not a valid university representative" }
    if (rep.representedUniversity?.id !== universityId) return { error: "Representative does not belong to this university" }

    if (programId) {
        const program = await prisma.program.findUnique({ where: { id: programId }, select: { universityId: true } })
        if (!program || program.universityId !== universityId) return { error: "Program does not belong to this university" }
    }

    const selectedSlot = await prisma.availabilitySlot.findUnique({
        where: { id: slotId },
        select: { id: true, repId: true, universityId: true, startTime: true, endTime: true, isBooked: true, meetingId: true },
    })
    if (!selectedSlot) return { error: "No available slot found. Please select a different slot." }
    if (selectedSlot.repId !== repId || selectedSlot.universityId !== universityId) {
        return { error: "Invalid slot selection. Please refresh and try again." }
    }
    if (selectedSlot.isBooked || selectedSlot.meetingId) return { error: "This slot was just taken. Please choose another time." }

    const start = selectedSlot.startTime
    const slotDurationMinutes = Math.round((selectedSlot.endTime.getTime() - selectedSlot.startTime.getTime()) / 60_000)
    if (slotDurationMinutes !== durationMinutes) {
        return { error: `Selected slot is ${slotDurationMinutes} minutes; please choose the matching duration.` }
    }

    if (Math.abs(clientStart.getTime() - start.getTime()) > 60_000) {
        return { error: "Selected time no longer matches this slot. Please refresh and try again." }
    }

    const profileRaw = await prisma.availabilityProfile.findFirst({
        where: { universityId, repId, isActive: true },
        select: { timezone: true },
    })
    if (!profileRaw) return { error: 'No active availability profile found for this rep' }

    const schedTZ = profileRaw.timezone
    const zonedStart = getZonedDateParts(start, schedTZ)
    const requestedHHMM = `${zonedStart.hour}:${zonedStart.minute}`

    const profile = await prisma.availabilityProfile.findFirst({
        where: { universityId, repId, isActive: true, dayOfWeek: zonedStart.weekday },
    })
    if (!profile) return { error: `No availability configured for ${zonedStart.weekday} in ${schedTZ}` }

    if (!profile.meetingDurationOptions.includes(durationMinutes)) {
        return { error: `${durationMinutes} min not offered — allowed: ${profile.meetingDurationOptions.join(', ')} min` }
    }

    if (requestedHHMM < profile.startTime || requestedHHMM >= profile.endTime) {
        return { error: `Requested time (${requestedHHMM} ${schedTZ}) outside availability (${profile.startTime}–${profile.endTime} ${schedTZ})` }
    }

    if (start.getTime() - now.getTime() < profile.minLeadTimeHours * 3_600_000) {
        return { error: `Must book at least ${profile.minLeadTimeHours}h in advance` }
    }

    const dayRange = getZonedDayRangeUtc(start, schedTZ)

    const student = await prisma.student.findUnique({ where: { userId: session.user.id } })
    if (!student) return { error: "Student profile required" }

    const studentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { timezone: true },
    })

    try {
        const meeting = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const slot = await tx.availabilitySlot.findUnique({ where: { id: slotId } })
            if (!slot) throw new Error('NO_SLOT')
            if (slot.repId !== repId || slot.universityId !== universityId) throw new Error('SLOT_MISMATCH')
            if (slot.isBooked || slot.meetingId) throw new Error('SLOT_TAKEN')

            const txSlotDuration = Math.round((slot.endTime.getTime() - slot.startTime.getTime()) / 60_000)
            if (txSlotDuration !== durationMinutes) throw new Error('DURATION_MISMATCH')

            const todayCount = await tx.meeting.count({
                where: { repId, status: { not: 'CANCELLED' }, startTime: { gte: dayRange.start, lt: dayRange.end } },
            })
            if (todayCount >= profile.dailyCap) throw new Error('DAILY_CAP')

            const conflict = await tx.meeting.findFirst({
                where: {
                    repId,
                    status: { not: 'CANCELLED' },
                    startTime: { lt: slot.endTime },
                    endTime: { gt: slot.startTime },
                },
            })
            if (conflict) throw new Error('SLOT_TAKEN')

            const newMeeting = await tx.meeting.create({
                data: {
                    studentId: student.id,
                    universityId, repId, programId, purpose, studentQuestions,
                    durationMinutes,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    studentTimezone: studentUser?.timezone || studentTimezone,
                    repTimezone: rep.timezone || profile.timezone,
                    status: 'PENDING',
                    videoProvider,
                    meetingCode: generateMeetingCode(),
                },
            })

            await tx.availabilitySlot.update({
                where: { id: slot.id },
                data: { isBooked: true, meetingId: newMeeting.id },
            })

            return newMeeting
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5_000, timeout: 10_000 })

        const universityRecord = await prisma.university.findUnique({
            where: { id: universityId },
            include: { user: true },
        })

        const repUser = await prisma.user.findUnique({ where: { id: repId }, select: { email: true } })
        if (repUser?.email) {
            await sendMeetingRequestEmail(
                repUser.email,
                student.fullName || 'Student',
                student.country || 'N/A',
                purpose,
                meeting.startTime,
                durationMinutes,
                meeting.id,
                studentQuestions,
                profile.timezone
            )
        }

        if (universityRecord?.user?.id) {
            await createNotification({
                userId: universityRecord.user.id,
                type: 'MEETING_REQUEST',
                title: 'New Meeting Request',
                message: `${student.fullName || 'A student'} requested a ${durationMinutes}-min meeting on ${meeting.startTime.toLocaleDateString()}`,
                payload: { meetingId: meeting.id, studentId: student.id },
            })
        }

        await notifyUniversity(universityId, {
            title: 'New Meeting Request',
            message: `${student.fullName || 'A student'} requested a ${durationMinutes}-min meeting on ${meeting.startTime.toLocaleDateString()}.`,
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
        if (error?.message === 'SLOT_TAKEN') return { error: "This slot was just taken. Please choose another time." }
        if (error?.message === 'NO_SLOT') return { error: "No available slot found. Please select a different slot." }
        if (error?.message === 'SLOT_MISMATCH') return { error: "Invalid slot selection. Please refresh and try again." }
        if (error?.message === 'DURATION_MISMATCH') return { error: "Selected slot duration no longer matches. Please refresh and try again." }
        if (error?.message === 'DAILY_CAP') return { error: `Daily cap of ${profile.dailyCap} meetings reached for this rep` }
        if (error?.code === 'P2034') return { error: "The slot was being booked at the same time by another request. Please try again." }
        console.error("[Meeting Booking]", error)
        return { error: "Failed to book meeting. Please try again." }
    }
}
