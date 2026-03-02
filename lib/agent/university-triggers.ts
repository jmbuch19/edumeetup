/**
 * lib/agent/university-triggers.ts
 *
 * Instant alert triggers for university partners.
 * Fires on: new interest, meeting booked, meeting cancelled, daily brief.
 * Respects university notificationPrefs including quiet hours.
 */

import { prisma } from '@/lib/prisma'

export type UniversityAgentActionType =
  | 'ALERT_NEW_INTEREST'
  | 'ALERT_MEETING_BOOKED'
  | 'ALERT_MEETING_CANCELLED'
  | 'SEND_DAILY_BRIEF'

export type UniversityAgentAction = {
  type: UniversityAgentActionType
  universityId: string
  universityEmail: string
  universityName: string
  repName?: string
  interestId?: string
  studentName?: string
  studentEmail?: string
  programName?: string
  meetingId?: string
  meetingTitle?: string
  meetingStartTime?: Date
  meetingDuration?: number
  meetingJoinUrl?: string
  cancelReason?: string
}

// ── Preference types ──────────────────────────────────────────────────────────
export type UniversityNotificationPrefs = {
  alertNewInterest: boolean
  alertMeetingBooked: boolean
  alertMeetingCancelled: boolean
  dailyBrief: boolean
  responseSlaHours: 24 | 48 | 72
  notifyTarget: 'PRIMARY' | 'ALL'  // ALL = placeholder, defaults to PRIMARY
  quietHoursEnabled: boolean
  quietHoursStart: string          // "22:00" IST
  quietHoursEnd: string            // "07:00" IST
}

export function getDefaultPrefs(): UniversityNotificationPrefs {
  return {
    alertNewInterest: true,
    alertMeetingBooked: true,
    alertMeetingCancelled: true,
    dailyBrief: true,
    responseSlaHours: 48,
    notifyTarget: 'PRIMARY',
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  }
}

export function mergePrefs(stored: unknown): UniversityNotificationPrefs {
  const defaults = getDefaultPrefs()
  if (!stored || typeof stored !== 'object') return defaults
  return { ...defaults, ...(stored as Partial<UniversityNotificationPrefs>) }
}

// ── Quiet hours check (IST) ───────────────────────────────────────────────────
export function isQuietHour(prefs: UniversityNotificationPrefs): boolean {
  if (!prefs.quietHoursEnabled) return false
  const now = new Date()
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const current = ist.getHours() * 60 + ist.getMinutes()
  const [sh, sm] = prefs.quietHoursStart.split(':').map(Number)
  const [eh, em] = prefs.quietHoursEnd.split(':').map(Number)
  const start = sh * 60 + sm
  const end = eh * 60 + em
  // Overnight window (e.g. 22:00 – 07:00)
  if (start > end) return current >= start || current <= end
  return current >= start && current <= end
}

// ── Helper ────────────────────────────────────────────────────────────────────
async function alreadyFired(action: string, entityId: string): Promise<boolean> {
  return !!(await prisma.auditLog.findFirst({ where: { action, entityId } }))
}

// ── TRIGGER 1: New Interest ───────────────────────────────────────────────────
export async function triggerNewInterestAlerts(): Promise<UniversityAgentAction[]> {
  const actions: UniversityAgentAction[] = []
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)

  const newInterests = await prisma.interest.findMany({
    where: { status: 'INTERESTED', createdAt: { gte: twoHoursAgo } },
    include: {
      university: { include: { user: { select: { email: true, name: true } } } },
      student: { select: { fullName: true, user: { select: { email: true } } } },
      program: { select: { programName: true } },
    },
  })

  for (const interest of newInterests) {
    if (await alreadyFired('AGENT_NEW_INTEREST_ALERTED', interest.id)) continue
    const prefs = mergePrefs(interest.university.notificationPrefs)
    if (!prefs.alertNewInterest || isQuietHour(prefs)) continue

    actions.push({
      type: 'ALERT_NEW_INTEREST',
      universityId: interest.universityId,
      universityEmail: interest.university.user.email,
      universityName: interest.university.institutionName,
      repName: interest.university.user.name || undefined,
      interestId: interest.id,
      studentName: interest.student.fullName || 'A student',
      studentEmail: interest.student.user.email,
      programName: interest.program?.programName || undefined,
    })
  }

  return actions
}

// ── TRIGGER 2: Meeting Booked ─────────────────────────────────────────────────
export async function triggerMeetingBookedAlerts(): Promise<UniversityAgentAction[]> {
  const actions: UniversityAgentAction[] = []
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)

  const newMeetings = await prisma.meeting.findMany({
    where: {
      status: { in: ['PENDING', 'CONFIRMED'] },
      createdAt: { gte: twoHoursAgo },
    },
    include: {
      university: { include: { user: { select: { email: true, name: true } } } },
      student: { select: { fullName: true } },
    },
  })

  for (const meeting of newMeetings) {
    if (await alreadyFired('AGENT_MEETING_BOOKED_ALERTED', meeting.id)) continue
    const prefs = mergePrefs(meeting.university.notificationPrefs)
    if (!prefs.alertMeetingBooked || isQuietHour(prefs)) continue

    actions.push({
      type: 'ALERT_MEETING_BOOKED',
      universityId: meeting.universityId,
      universityEmail: meeting.university.user.email,
      universityName: meeting.university.institutionName,
      repName: meeting.university.user.name || undefined,
      meetingId: meeting.id,
      meetingTitle: meeting.title || 'Student Meeting',
      meetingStartTime: meeting.startTime,
      meetingDuration: meeting.durationMinutes,
      meetingJoinUrl: meeting.joinUrl || undefined,
      studentName: meeting.student?.fullName || 'A student',
    })
  }

  return actions
}

// ── TRIGGER 3: Meeting Cancelled ──────────────────────────────────────────────
export async function triggerMeetingCancelledAlerts(): Promise<UniversityAgentAction[]> {
  const actions: UniversityAgentAction[] = []
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)

  const cancelled = await prisma.meeting.findMany({
    where: { status: 'CANCELLED', updatedAt: { gte: twoHoursAgo } },
    include: {
      university: { include: { user: { select: { email: true, name: true } } } },
      student: { select: { fullName: true } },
    },
  })

  for (const meeting of cancelled) {
    if (await alreadyFired('AGENT_MEETING_CANCELLED_ALERTED', meeting.id)) continue
    const prefs = mergePrefs(meeting.university.notificationPrefs)
    if (!prefs.alertMeetingCancelled || isQuietHour(prefs)) continue

    actions.push({
      type: 'ALERT_MEETING_CANCELLED',
      universityId: meeting.universityId,
      universityEmail: meeting.university.user.email,
      universityName: meeting.university.institutionName,
      repName: meeting.university.user.name || undefined,
      meetingId: meeting.id,
      meetingTitle: meeting.title || 'Student Meeting',
      meetingStartTime: meeting.startTime,
      studentName: meeting.student?.fullName || 'A student',
      cancelReason: (meeting as any).cancelReason || undefined,
    })
  }

  return actions
}

// ── TRIGGER 4: Daily Brief ────────────────────────────────────────────────────
/**
 * Fires once per day per university between 9:00–9:59am IST.
 * Only sends if there's something worth reporting.
 */
export async function triggerDailyBriefs(): Promise<UniversityAgentAction[]> {
  const actions: UniversityAgentAction[] = []

  // Only fire during 9am IST hour
  const now = new Date()
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  if (ist.getHours() !== 9) return []

  const todayIST = new Date(ist)
  todayIST.setHours(0, 0, 0, 0)

  const universities = await prisma.university.findMany({
    where: { verificationStatus: 'VERIFIED' },
    include: { user: { select: { email: true, name: true } } },
  })

  for (const university of universities) {
    const prefs = mergePrefs(university.notificationPrefs)
    if (!prefs.dailyBrief) continue

    const alreadySentToday = await prisma.auditLog.findFirst({
      where: {
        action: 'AGENT_DAILY_BRIEF_SENT',
        entityId: university.id,
        createdAt: { gte: todayIST },
      },
    })
    if (alreadySentToday) continue

    actions.push({
      type: 'SEND_DAILY_BRIEF',
      universityId: university.id,
      universityEmail: university.user.email,
      universityName: university.institutionName,
      repName: university.user.name || undefined,
    })
  }

  return actions
}
