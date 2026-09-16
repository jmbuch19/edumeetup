'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { MeetingPurpose, Prisma, VideoProvider } from '@prisma/client'
import { z } from 'zod'
import { requireStudentUser } from '@/lib/auth/requireAuth'
import { prisma } from '@/lib/prisma'
import { createNotification, sendMeetingRequestEmail } from '@/lib/notifications'
import { notifyStudent, notifyUniversity } from '@/lib/notify'
import { ensureBookingSlots } from '@/lib/booking-slot-materializer'

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
    value => (VALID_DURATIONS as readonly number[]).includes(value),
    { message: `Duration must be one of: ${VALID_DURATIONS.join(', ')} minutes` },
  ),
  startTime: z.string().datetime(),
  videoProvider: z.nativeEnum(VideoProvider).optional(),
  audioOnly: z.boolean().default(false),
  studentTimezone: z.string().min(1).max(100).refine(
    tz => { try { Intl.DateTimeFormat(undefined, { timeZone: tz }); return true } catch { return false } },
    { message: 'Invalid IANA timezone' },
  ).default('UTC'),
})

export type HardenedBookingData = z.infer<typeof bookingSchema>

function generateMeetingCode() {
  return `EDU-${new Date().getFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`
}

function getZonedDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value ?? ''
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    weekday: get('weekday').toUpperCase() as Weekday,
    hour: get('hour') === '24' ? '00' : get('hour'),
    minute: get('minute'),
  }
}

function zonedMidnightUtc(year: number, month: number, day: number, timeZone: string) {
  let candidate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
  const target = Date.UTC(year, month - 1, day, 0, 0, 0, 0)
  for (let i = 0; i < 4; i++) {
    const p = getZonedDateParts(candidate, timeZone)
    const represented = Date.UTC(p.year, p.month - 1, p.day, Number(p.hour), Number(p.minute), 0, 0)
    const corrected = new Date(candidate.getTime() - (represented - target))
    if (corrected.getTime() === candidate.getTime()) return corrected
    candidate = corrected
  }
  return candidate
}

function getZonedDayRangeUtc(date: Date, timeZone: string) {
  const p = getZonedDateParts(date, timeZone)
  const start = zonedMidnightUtc(p.year, p.month, p.day, timeZone)
  const nextNominal = new Date(Date.UTC(p.year, p.month - 1, p.day + 1, 12, 0, 0, 0))
  const next = getZonedDateParts(nextNominal, timeZone)
  const end = zonedMidnightUtc(next.year, next.month, next.day, timeZone)
  return { start, end }
}

export async function getBookingDataHardened(universityId: string) {
  const session = await requireStudentUser().catch(() => null)
  if (!session) return { error: 'Unauthorized' }

  const university = await prisma.university.findFirst({
    where: { id: universityId, verificationStatus: 'VERIFIED', isPublic: true },
    include: {
      user: { select: { name: true, image: true } },
      availabilityProfiles: {
        where: { isActive: true },
        include: { repUser: { select: { id: true, name: true, image: true, role: true, isActive: true } } },
      },
      programList: {
        where: { status: 'ACTIVE' },
        select: { id: true, programName: true, degreeLevel: true },
      },
    },
  })
  if (!university) return { error: 'University is not available for booking' }

  const existingBookings = await prisma.meeting.findMany({
    where: {
      universityId,
      startTime: { gte: new Date() },
      status: { not: 'CANCELLED' },
    },
    select: { repId: true, startTime: true, endTime: true, status: true },
  })

  await ensureBookingSlots(universityId, university.availabilityProfiles, existingBookings)

  const availableSlots = await prisma.availabilitySlot.findMany({
    where: {
      universityId,
      startTime: { gte: new Date() },
      isBooked: false,
      meetingId: null,
    },
    select: { id: true, repId: true, startTime: true, endTime: true },
    orderBy: { startTime: 'asc' },
    take: 500,
  })

  return { university, existingBookings, availableSlots }
}

export async function createMeetingRequestHardened(input: HardenedBookingData) {
  const session = await requireStudentUser().catch(() => null)
  if (!session) return { error: 'Unauthorized' }

  const parsed = bookingSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid request', details: parsed.error.flatten() }

  const {
    universityId, repId, slotId, programId, purpose, studentQuestions,
    durationMinutes, startTime, studentTimezone,
  } = parsed.data

  const now = new Date()
  const clientStart = new Date(startTime)

  const university = await prisma.university.findFirst({
    where: { id: universityId, verificationStatus: 'VERIFIED', isPublic: true },
    select: { id: true, userId: true, institutionName: true },
  })
  if (!university) return { error: 'University is not available for booking' }

  const rep = await prisma.user.findUnique({
    where: { id: repId },
    select: {
      id: true, isActive: true, role: true, timezone: true,
      representedUniversity: { select: { id: true } },
    },
  })
  if (!rep?.isActive) return { error: 'Representative is not available' }

  const repBelongsToUniversity =
    (rep.role === 'UNIVERSITY' && rep.id === university.userId) ||
    (rep.role === 'UNIVERSITY_REP' && rep.representedUniversity?.id === universityId)
  if (!repBelongsToUniversity) return { error: 'Representative does not belong to this university' }

  if (programId) {
    const program = await prisma.program.findFirst({
      where: { id: programId, universityId, status: 'ACTIVE' },
      select: { id: true },
    })
    if (!program) return { error: 'Program is not available for this university' }
  }

  const selectedSlot = await prisma.availabilitySlot.findUnique({
    where: { id: slotId },
    select: {
      id: true, repId: true, universityId: true, startTime: true, endTime: true,
      isBooked: true, meetingId: true,
    },
  })
  if (!selectedSlot) return { error: 'No available slot found. Please select a different slot.' }
  if (selectedSlot.repId !== repId || selectedSlot.universityId !== universityId) {
    return { error: 'Invalid slot selection. Please refresh and try again.' }
  }
  if (selectedSlot.isBooked || selectedSlot.meetingId) {
    return { error: 'This slot was just taken. Please choose another time.' }
  }

  const slotDuration = Math.round((selectedSlot.endTime.getTime() - selectedSlot.startTime.getTime()) / 60_000)
  if (slotDuration !== durationMinutes) {
    return { error: `Selected slot is ${slotDuration} minutes. Please choose a matching slot.` }
  }
  if (Math.abs(clientStart.getTime() - selectedSlot.startTime.getTime()) > 60_000) {
    return { error: 'Selected time no longer matches this slot. Please refresh and try again.' }
  }

  const profileProbe = await prisma.availabilityProfile.findFirst({
    where: { universityId, repId, isActive: true },
    select: { timezone: true },
  })
  if (!profileProbe) return { error: 'This representative has no active availability' }

  const schedTZ = profileProbe.timezone || 'UTC'
  const zonedStart = getZonedDateParts(selectedSlot.startTime, schedTZ)
  const profile = await prisma.availabilityProfile.findFirst({
    where: { universityId, repId, isActive: true, dayOfWeek: zonedStart.weekday },
  })
  if (!profile) return { error: 'This time is no longer available' }

  if (!profile.meetingDurationOptions.includes(durationMinutes)) {
    return { error: `${durationMinutes} minute meetings are no longer offered at this time` }
  }
  if (`${zonedStart.hour}:${zonedStart.minute}` < profile.startTime || `${zonedStart.hour}:${zonedStart.minute}` >= profile.endTime) {
    return { error: 'Selected time is outside the representative’s availability' }
  }
  if (selectedSlot.startTime.getTime() - now.getTime() < profile.minLeadTimeHours * 3_600_000) {
    return { error: `Meetings must be booked at least ${profile.minLeadTimeHours} hours in advance` }
  }

  const student = await prisma.student.findUnique({ where: { userId: session.user.id } })
  if (!student) return { error: 'Student profile required' }
  const studentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { timezone: true },
  })

  const dayRange = getZonedDayRangeUtc(selectedSlot.startTime, schedTZ)

  try {
    const meeting = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const slot = await tx.availabilitySlot.findUnique({ where: { id: slotId } })
      if (!slot) throw new Error('NO_SLOT')
      if (slot.repId !== repId || slot.universityId !== universityId) throw new Error('SLOT_MISMATCH')
      if (slot.isBooked || slot.meetingId) throw new Error('SLOT_TAKEN')

      const currentSlotDuration = Math.round((slot.endTime.getTime() - slot.startTime.getTime()) / 60_000)
      if (currentSlotDuration !== durationMinutes) throw new Error('DURATION_MISMATCH')

      const todayCount = await tx.meeting.count({
        where: {
          repId,
          status: { not: 'CANCELLED' },
          startTime: { gte: dayRange.start, lt: dayRange.end },
        },
      })
      if (todayCount >= profile.dailyCap) throw new Error('DAILY_CAP')

      const conflict = await tx.meeting.findFirst({
        where: {
          repId,
          status: { not: 'CANCELLED' },
          startTime: { lt: slot.endTime },
          endTime: { gt: slot.startTime },
        },
        select: { id: true },
      })
      if (conflict) throw new Error('SLOT_TAKEN')

      const newMeeting = await tx.meeting.create({
        data: {
          studentId: student.id,
          universityId,
          repId,
          programId,
          purpose,
          studentQuestions,
          durationMinutes,
          startTime: slot.startTime,
          endTime: slot.endTime,
          studentTimezone: studentUser?.timezone || studentTimezone,
          repTimezone: rep.timezone || profile.timezone,
          status: 'PENDING',
          videoProvider: profile.videoProvider,
          joinUrl: profile.videoProvider === 'EXTERNAL_LINK' && profile.externalLink ? profile.externalLink : null,
          videoLink: profile.videoProvider === 'EXTERNAL_LINK' && profile.externalLink ? profile.externalLink : null,
          meetingCode: generateMeetingCode(),
        },
      })

      await tx.availabilitySlot.update({
        where: { id: slot.id },
        data: { isBooked: true, meetingId: newMeeting.id },
      })

      await tx.meetingParticipant.createMany({
        data: [
          {
            meetingId: newMeeting.id,
            participantUserId: session.user.id,
            participantType: 'STUDENT',
            rsvpStatus: 'ACCEPTED',
          },
          {
            meetingId: newMeeting.id,
            participantUserId: repId,
            participantType: rep.role === 'UNIVERSITY' ? 'UNIVERSITY' : 'UNIVERSITY_REP',
            rsvpStatus: 'ACCEPTED',
          },
        ],
        skipDuplicates: true,
      })

      return newMeeting
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5_000,
      timeout: 10_000,
    })

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
        profile.timezone,
      )
    }

    if (universityRecord?.user?.id) {
      await createNotification({
        userId: universityRecord.user.id,
        type: 'MEETING_REQUEST',
        title: 'New Meeting Request',
        message: `${student.fullName || 'A student'} requested a ${durationMinutes}-min meeting.`,
        payload: { meetingId: meeting.id, studentId: student.id },
      })
    }

    await notifyUniversity(universityId, {
      title: 'New Meeting Request',
      message: `${student.fullName || 'A student'} requested a ${durationMinutes}-min meeting.`,
      type: 'INFO',
      actionUrl: '/university/meetings',
    })
    await notifyStudent(student.id, {
      title: 'Meeting Request Sent',
      message: `Your request with ${university.institutionName} has been submitted. You will be notified when confirmed.`,
      type: 'INFO',
      actionUrl: '/student/meetings',
    })

    revalidatePath('/student/meetings')
    revalidatePath('/student/dashboard')
    revalidatePath('/university/meetings')

    return { success: true, meetingId: meeting.id }
  } catch (error: any) {
    if (error?.message === 'SLOT_TAKEN') return { error: 'This slot was just taken. Please choose another time.' }
    if (error?.message === 'NO_SLOT') return { error: 'No available slot found. Please select a different slot.' }
    if (error?.message === 'SLOT_MISMATCH') return { error: 'Invalid slot selection. Please refresh and try again.' }
    if (error?.message === 'DURATION_MISMATCH') return { error: 'Selected slot duration no longer matches. Please refresh and try again.' }
    if (error?.message === 'DAILY_CAP') return { error: `Daily cap of ${profile.dailyCap} meetings reached for this representative` }
    if (error?.code === 'P2034') return { error: 'The slot was being booked by another student. Please try again.' }
    console.error('[Meeting Booking] Failed')
    return { error: 'Failed to book meeting. Please try again.' }
  }
}
