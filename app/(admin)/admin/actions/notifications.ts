'use server'

import { prisma } from '@/lib/prisma'

export type AdminNotification = {
  id: string
  type: 'URGENT' | 'INFO' | 'MILESTONE' | 'WARNING'
  title: string
  message: string
  actionUrl?: string
  icon: string
  createdAt: Date
}

export type MilestoneAlert = {
  id: string
  emoji: string
  title: string
  message: string
}

// ── Milestone thresholds ──────────────────────────────────────────────────────
const STUDENT_MILESTONES = [1, 10, 50, 100, 500, 1000]
const UNIVERSITY_MILESTONES = [1, 5, 10, 25, 50, 100]
const MEETING_MILESTONES = [1, 10, 50, 100, 500]

async function getSeenMilestones(): Promise<string[]> {
  const logs = await prisma.systemLog.findMany({
    where: { type: 'MILESTONE_SEEN' },
    select: { message: true }
  })
  return logs.map(l => l.message)
}

async function markMilestoneSeen(milestoneId: string) {
  await prisma.systemLog.create({
    data: {
      level: 'INFO',
      type: 'MILESTONE_SEEN',
      message: milestoneId
    }
  })
}

export async function getAdminNotifications(): Promise<{
  notifications: AdminNotification[]
  milestones: MilestoneAlert[]
  unreadCount: number
}> {
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)

  const [
    pendingVerifications,
    oldestPending,
    openTickets,
    newStudentsToday,
    newStudentsYesterday,
    meetingsToday,
    pendingAdvisory,
    pendingHostRequests,
    totalStudents,
    totalUniversities,
    totalMeetings,
    seenMilestones,
  ] = await Promise.all([
    prisma.university.count({ where: { verificationStatus: 'PENDING' } }),
    prisma.university.findFirst({
      where: { verificationStatus: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true, institutionName: true }
    }),
    prisma.supportTicket.count({ where: { status: 'NEW' } }),
    prisma.student.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.student.count({ where: { createdAt: { gte: yesterdayStart, lt: todayStart } } }),
    prisma.meeting.count({
      where: {
        startTime: { gte: todayStart },
        status: { in: ['CONFIRMED', 'PENDING'] }
      }
    }),
    prisma.advisoryRequest.count({ where: { status: 'NEW' } }),
    prisma.hostRequest.count({ where: { status: 'SUBMITTED' } }),
    prisma.student.count(),
    prisma.university.count(),
    prisma.meeting.count(),
    getSeenMilestones(),
  ])

  const notifications: AdminNotification[] = []

  // ── URGENT: Overdue verifications ──────────────────────────────────────────
  if (pendingVerifications > 0 && oldestPending?.createdAt) {
    const hoursWaiting = Math.floor(
      (now.getTime() - oldestPending.createdAt.getTime()) / (1000 * 60 * 60)
    )
    const isOverdue = hoursWaiting > 48

    notifications.push({
      id: 'pending-verifications',
      type: isOverdue ? 'URGENT' : 'WARNING',
      title: `${pendingVerifications} Pending Verification${pendingVerifications > 1 ? 's' : ''}`,
      message: isOverdue
        ? `Oldest request is ${Math.floor(hoursWaiting / 24)} days old — action needed`
        : `${oldestPending.institutionName} has been waiting ${hoursWaiting}h`,
      actionUrl: '/admin/universities',
      icon: '🏫',
      createdAt: oldestPending.createdAt,
    })
  }

  // ── URGENT: Open support tickets ───────────────────────────────────────────
  if (openTickets > 0) {
    notifications.push({
      id: 'open-tickets',
      type: openTickets > 3 ? 'URGENT' : 'WARNING',
      title: `${openTickets} Open Support Ticket${openTickets > 1 ? 's' : ''}`,
      message: openTickets > 3
        ? `${openTickets} tickets need attention — high volume`
        : `${openTickets} ticket${openTickets > 1 ? 's' : ''} awaiting response`,
      actionUrl: '/admin/tickets',
      icon: '🎫',
      createdAt: now,
    })
  }

  // ── INFO: New students today ────────────────────────────────────────────────
  if (newStudentsToday > 0) {
    notifications.push({
      id: 'new-students-today',
      type: 'INFO',
      title: `${newStudentsToday} New Student${newStudentsToday > 1 ? 's' : ''} Today`,
      message: newStudentsYesterday > 0
        ? `${newStudentsToday} today vs ${newStudentsYesterday} yesterday`
        : `${newStudentsToday} student${newStudentsToday > 1 ? 's' : ''} joined the platform today`,
      actionUrl: '/admin/users',
      icon: '🎓',
      createdAt: todayStart,
    })
  }

  // ── INFO: Meetings today ────────────────────────────────────────────────────
  if (meetingsToday > 0) {
    notifications.push({
      id: 'meetings-today',
      type: 'INFO',
      title: `${meetingsToday} Meeting${meetingsToday > 1 ? 's' : ''} Today`,
      message: `${meetingsToday} meeting${meetingsToday > 1 ? 's are' : ' is'} scheduled for today`,
      actionUrl: '/admin/overview',
      icon: '📅',
      createdAt: todayStart,
    })
  }

  // ── INFO: Pending advisory ──────────────────────────────────────────────────
  if (pendingAdvisory > 0) {
    notifications.push({
      id: 'pending-advisory',
      type: 'INFO',
      title: `${pendingAdvisory} Advisory Request${pendingAdvisory > 1 ? 's' : ''}`,
      message: `${pendingAdvisory} student${pendingAdvisory > 1 ? 's' : ''} waiting for guidance`,
      actionUrl: '/admin/advisory',
      icon: '📋',
      createdAt: now,
    })
  }

  // ── INFO: Pending host requests ─────────────────────────────────────────────
  if (pendingHostRequests > 0) {
    notifications.push({
      id: 'pending-host-requests',
      type: 'INFO',
      title: `${pendingHostRequests} Campus Fair Request${pendingHostRequests > 1 ? 's' : ''}`,
      message: `${pendingHostRequests} institution${pendingHostRequests > 1 ? 's' : ''} want to host a campus fair`,
      actionUrl: '/admin/host-requests',
      icon: '🌏',
      createdAt: now,
    })
  }

  // ── MILESTONES ──────────────────────────────────────────────────────────────
  const milestones: MilestoneAlert[] = []

  for (const threshold of STUDENT_MILESTONES) {
    const milestoneId = `students-${threshold}`
    if (totalStudents >= threshold && !seenMilestones.includes(milestoneId)) {
      milestones.push({
        id: milestoneId,
        emoji: '🎉',
        title: `${threshold} Students Registered!`,
        message: `EdUmeetup has reached ${threshold} students on the platform.`,
      })
      await markMilestoneSeen(milestoneId)
      break
    }
  }

  for (const threshold of UNIVERSITY_MILESTONES) {
    const milestoneId = `universities-${threshold}`
    if (totalUniversities >= threshold && !seenMilestones.includes(milestoneId)) {
      milestones.push({
        id: milestoneId,
        emoji: '🏛️',
        title: `${threshold} Universities Onboarded!`,
        message: `${threshold} universities are now on EdUmeetup.`,
      })
      await markMilestoneSeen(milestoneId)
      break
    }
  }

  for (const threshold of MEETING_MILESTONES) {
    const milestoneId = `meetings-${threshold}`
    if (totalMeetings >= threshold && !seenMilestones.includes(milestoneId)) {
      milestones.push({
        id: milestoneId,
        emoji: '📅',
        title: `${threshold} Meetings Completed!`,
        message: `${threshold} student-university meetings have taken place on EdUmeetup.`,
      })
      await markMilestoneSeen(milestoneId)
      break
    }
  }

  const urgentCount = notifications.filter(n => n.type === 'URGENT').length
  const warningCount = notifications.filter(n => n.type === 'WARNING').length
  const unreadCount = urgentCount + warningCount + milestones.length

  return { notifications, milestones, unreadCount }
}
