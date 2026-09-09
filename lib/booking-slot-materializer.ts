import type { AvailabilityProfile, Meeting } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const VALID_DURATIONS = new Set([10, 15, 20])
const HORIZON_DAYS = 14

type Weekday = AvailabilityProfile['dayOfWeek']

type ExistingMeetingWindow = Pick<Meeting, 'repId' | 'startTime' | 'endTime' | 'status'>

function zonedParts(date: Date, timeZone: string) {
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
    hour: get('hour') === '24' ? 0 : Number(get('hour')),
    minute: Number(get('minute')),
  }
}

function localToUtc(year: number, month: number, day: number, hour: number, minute: number, timeZone: string) {
  let candidate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0))
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0)

  for (let i = 0; i < 4; i++) {
    const p = zonedParts(candidate, timeZone)
    const representedAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, 0, 0)
    const corrected = new Date(candidate.getTime() - (representedAsUtc - targetAsUtc))
    if (corrected.getTime() === candidate.getTime()) return corrected
    candidate = corrected
  }
  return candidate
}

function parseHHMM(value: string) {
  const [h, m] = value.split(':').map(Number)
  return { hour: h, minute: m }
}

function overlapsMeeting(repId: string, startTime: Date, endTime: Date, meetings: ExistingMeetingWindow[]) {
  return meetings.some(meeting =>
    meeting.repId === repId &&
    meeting.status !== 'CANCELLED' &&
    meeting.startTime < endTime &&
    meeting.endTime > startTime
  )
}

/**
 * Materialise concrete AvailabilitySlot rows from weekly AvailabilityProfile rules.
 *
 * The current schema stores one concrete duration per slot. To avoid overlapping
 * alternatives for 10/15/20 minute options, offered durations are distributed
 * round-robin through each rep's day. This keeps every generated slot genuinely
 * bookable while still exposing each duration the rep selected.
 */
export async function ensureBookingSlots(
  universityId: string,
  profiles: AvailabilityProfile[],
  meetings: ExistingMeetingWindow[],
) {
  const activeProfiles = profiles.filter(profile => profile.isActive)
  if (activeProfiles.length === 0) return

  const now = new Date()
  const horizon = new Date(now.getTime() + HORIZON_DAYS * 24 * 60 * 60 * 1000)
  const existing = await prisma.availabilitySlot.findMany({
    where: {
      universityId,
      startTime: { gte: now, lte: horizon },
    },
    select: { repId: true, startTime: true, endTime: true },
  })
  const existingKeys = new Set(existing.map(slot => `${slot.repId}|${slot.startTime.toISOString()}|${slot.endTime.toISOString()}`))

  const candidates: { universityId: string; repId: string; startTime: Date; endTime: Date; isBooked: boolean }[] = []
  const profileByRepAndDay = new Map(activeProfiles.map(profile => [`${profile.repId}|${profile.dayOfWeek}`, profile]))
  const reps = Array.from(new Set(activeProfiles.map(profile => profile.repId)))

  for (const repId of reps) {
    const seedProfile = activeProfiles.find(profile => profile.repId === repId)
    if (!seedProfile) continue
    const timeZone = seedProfile.timezone || 'UTC'
    const today = zonedParts(now, timeZone)

    for (let offset = 0; offset < HORIZON_DAYS; offset++) {
      const nominal = new Date(Date.UTC(today.year, today.month - 1, today.day + offset, 12, 0, 0, 0))
      const localDay = zonedParts(nominal, timeZone)
      const profile = profileByRepAndDay.get(`${repId}|${localDay.weekday}`)
      if (!profile) continue

      const durations = profile.meetingDurationOptions
        .filter(duration => VALID_DURATIONS.has(duration))
        .sort((a, b) => a - b)
      if (durations.length === 0) continue

      const startParts = parseHHMM(profile.startTime)
      const endParts = parseHHMM(profile.endTime)
      const dayStart = localToUtc(localDay.year, localDay.month, localDay.day, startParts.hour, startParts.minute, timeZone)
      const dayEnd = localToUtc(localDay.year, localDay.month, localDay.day, endParts.hour, endParts.minute, timeZone)

      let cursor = dayStart
      let durationIndex = 0
      while (cursor < dayEnd) {
        const duration = durations[durationIndex % durations.length]
        const endTime = new Date(cursor.getTime() + duration * 60_000)
        if (endTime > dayEnd) break

        const leadTimeBoundary = new Date(now.getTime() + profile.minLeadTimeHours * 3_600_000)
        if (cursor >= leadTimeBoundary && !overlapsMeeting(repId, cursor, endTime, meetings)) {
          const key = `${repId}|${cursor.toISOString()}|${endTime.toISOString()}`
          if (!existingKeys.has(key)) {
            candidates.push({ universityId, repId, startTime: cursor, endTime, isBooked: false })
            existingKeys.add(key)
          }
        }

        cursor = new Date(endTime.getTime() + profile.bufferMinutes * 60_000)
        durationIndex++
      }
    }
  }

  if (candidates.length > 0) {
    await prisma.availabilitySlot.createMany({ data: candidates })
  }
}
