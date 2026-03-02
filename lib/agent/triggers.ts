/**
 * lib/agent/triggers.ts
 *
 * Four trigger functions for the edUmeetup automated agent.
 * Each trigger queries the DB and returns a list of AgentActions to execute.
 * No side effects here — pure data in, actions out.
 */

import { prisma } from '@/lib/prisma'

export type AgentActionType =
  | 'NOTIFY_PROFILE_COMPLETE'
  | 'NOTIFY_INACTIVE_NUDGE'
  | 'NOTIFY_UNIVERSITY_RESPONSE_DELAY'
  | 'NOTIFY_MEETING_REMINDER_STUDENT'
  | 'NOTIFY_MEETING_REMINDER_UNIVERSITY'

export type AgentAction = {
  type: AgentActionType
  studentId?: string
  studentEmail?: string
  studentName?: string
  universityId?: string
  universityEmail?: string
  universityName?: string
  meetingId?: string
  meetingTitle?: string
  meetingStartTime?: Date
  meetingDuration?: number
  meetingJoinUrl?: string
  meetingCode?: string
  interestId?: string
  payload?: Record<string, unknown>
}

// ── Helper: check if agent already fired this action ─────────────────────────
async function alreadyFired(action: string, entityId: string): Promise<boolean> {
  const existing = await prisma.auditLog.findFirst({
    where: { action, entityId },
  })
  return !!existing
}

// ── TRIGGER 1: Profile Completion ─────────────────────────────────────────────
/**
 * Fires once per student when they complete their profile.
 * Sends a "You're live!" welcome notification + email.
 */
export async function triggerProfileCompletion(): Promise<AgentAction[]> {
  const actions: AgentAction[] = []

  const completedStudents = await prisma.student.findMany({
    where: { profileComplete: true },
    include: {
      user: { select: { email: true } }
    },
  })

  for (const student of completedStudents) {
    const actionKey = 'AGENT_PROFILE_COMPLETE_NOTIFIED'
    if (await alreadyFired(actionKey, student.id)) continue

    actions.push({
      type: 'NOTIFY_PROFILE_COMPLETE',
      studentId: student.id,
      studentEmail: student.user.email,
      studentName: student.fullName || 'there',
    })
  }

  return actions
}

// ── TRIGGER 2: Inactive Student Nudge ────────────────────────────────────────
/**
 * Fires when a student has an incomplete profile and hasn't been active
 * for 3+ days. Max one nudge per student per 7 days.
 * Uses updatedAt as the inactivity proxy — no migration needed.
 */
export async function triggerInactiveNudge(): Promise<AgentAction[]> {
  const actions: AgentAction[] = []

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const inactiveStudents = await prisma.student.findMany({
    where: {
      profileComplete: false,
      updatedAt: { lt: threeDaysAgo },    // proxy for "not active in 3 days"
      createdAt: { lt: threeDaysAgo },    // skip brand-new accounts
    },
    include: {
      user: { select: { email: true } }
    },
  })

  for (const student of inactiveStudents) {
    const actionKey = 'AGENT_INACTIVE_NUDGE_SENT'

    // Check if we sent a nudge in the last 7 days
    const recentNudge = await prisma.auditLog.findFirst({
      where: {
        action: actionKey,
        entityId: student.id,
        createdAt: { gte: sevenDaysAgo },
      },
    })
    if (recentNudge) continue

    actions.push({
      type: 'NOTIFY_INACTIVE_NUDGE',
      studentId: student.id,
      studentEmail: student.user.email,
      studentName: student.fullName || 'there',
    })
  }

  return actions
}

// ── TRIGGER 3: University Response Delay ──────────────────────────────────────
/**
 * Fires when a student has expressed interest but the university
 * hasn't responded (no universityNote) after 48 hours.
 * Notifies the university once per interest.
 */
export async function triggerUniversityResponseDelay(): Promise<AgentAction[]> {
  const actions: AgentAction[] = []

  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)

  const stalledInterests = await prisma.interest.findMany({
    where: {
      status: 'INTERESTED',
      universityNote: null,
      createdAt: { lt: fortyEightHoursAgo },
    },
    include: {
      university: {
        include: {
          user: { select: { email: true } }
        }
      },
      student: {
        select: { fullName: true }
      },
    },
  })

  for (const interest of stalledInterests) {
    const actionKey = 'AGENT_RESPONSE_DELAY_NOTIFIED'
    if (await alreadyFired(actionKey, interest.id)) continue

    const hoursWaiting = Math.floor(
      (Date.now() - interest.createdAt.getTime()) / (1000 * 60 * 60)
    )

    actions.push({
      type: 'NOTIFY_UNIVERSITY_RESPONSE_DELAY',
      universityId: interest.universityId,
      universityEmail: interest.university.user.email,
      universityName: interest.university.institutionName,
      interestId: interest.id,
      payload: {
        studentName: interest.student.fullName || 'A student',
        hoursWaiting,
      },
    })
  }

  return actions
}

// ── TRIGGER 4: Meeting Reminder (24h before) ──────────────────────────────────
/**
 * Fires for all confirmed meetings starting in the next 23–25 hour window.
 * Uses the existing reminder24hSent flag to prevent duplicates.
 * Notifies both student and university rep.
 */
export async function triggerMeetingReminders(): Promise<AgentAction[]> {
  const actions: AgentAction[] = []

  const now = new Date()
  const in23Hours = new Date(now.getTime() + 23 * 60 * 60 * 1000)
  const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000)

  const upcomingMeetings = await prisma.meeting.findMany({
    where: {
      status: 'CONFIRMED',
      reminder24hSent: false,
      startTime: {
        gte: in23Hours,
        lte: in25Hours,
      },
    },
    include: {
      student: {
        include: {
          user: { select: { email: true } }
        }
      },
      university: {
        include: {
          user: { select: { email: true } }
        }
      },
    },
  })

  for (const meeting of upcomingMeetings) {
    // Student reminder
    if (meeting.student?.user?.email) {
      actions.push({
        type: 'NOTIFY_MEETING_REMINDER_STUDENT',
        meetingId: meeting.id,
        studentId: meeting.studentId ?? undefined,
        studentEmail: meeting.student.user.email,
        studentName: meeting.student.fullName || 'there',
        meetingTitle: meeting.title ?? 'Your Meeting',
        meetingStartTime: meeting.startTime,
        meetingDuration: meeting.durationMinutes,
        meetingJoinUrl: meeting.joinUrl ?? undefined,
        meetingCode: meeting.meetingCode,
      })
    }

    // University reminder
    if (meeting.university?.user?.email) {
      actions.push({
        type: 'NOTIFY_MEETING_REMINDER_UNIVERSITY',
        meetingId: meeting.id,
        universityId: meeting.universityId,
        universityEmail: meeting.university.user.email,
        universityName: meeting.university.institutionName,
        meetingTitle: meeting.title ?? 'Student Meeting',
        meetingStartTime: meeting.startTime,
        meetingDuration: meeting.durationMinutes,
        meetingJoinUrl: meeting.joinUrl ?? undefined,
        meetingCode: meeting.meetingCode,
      })
    }
  }

  return actions
}
