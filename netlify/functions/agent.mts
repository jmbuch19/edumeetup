import type { Config } from '@netlify/functions'
import {
  triggerProfileCompletion,
  triggerInactiveNudge,
  triggerUniversityResponseDelay,
  triggerMeetingReminders,
} from '../../lib/agent/triggers'
import { executeAction } from '../../lib/agent/executor'
import {
  triggerNewInterestAlerts,
  triggerMeetingBookedAlerts,
  triggerMeetingCancelledAlerts,
  triggerDailyBriefs,
  triggerProctorEscalations,
} from '../../lib/agent/university-triggers'
import { executeUniversityAction } from '../../lib/agent/university-executor'
import { prisma } from '../../lib/prisma'
import {
  sendFairEndReportToUniversity,
  sendPartialProfileNudge,
} from '../../lib/email/fair-notifications'

export default async function handler() {
  const startTime = Date.now()
  console.log(`[AGENT] Run started at ${new Date().toISOString()}`)

  const results = {
    // Student triggers
    profileComplete: 0,
    inactiveNudge: 0,
    responseDelay: 0,
    meetingReminders: 0,
    // University triggers
    newInterestAlerts: 0,
    meetingBookedAlerts: 0,
    meetingCancelledAlerts: 0,
    dailyBriefs: 0,
    proctorEscalations: 0,
    // Fair triggers
    fairReminder24h: 0,
    fairFollowupNudge: 0,
    fairPartialNudge: 0,
    fairMorningScannerReminder: 0,
    errors: 0,
  }

  try {
    // ── STUDENT TRIGGERS ──────────────────────────────────────────────────────
    console.log('[AGENT] Running student triggers...')

    for (const action of await triggerProfileCompletion()) {
      await executeAction(action); results.profileComplete++
    }
    for (const action of await triggerInactiveNudge()) {
      await executeAction(action); results.inactiveNudge++
    }
    for (const action of await triggerUniversityResponseDelay()) {
      await executeAction(action); results.responseDelay++
    }
    for (const action of await triggerMeetingReminders()) {
      await executeAction(action); results.meetingReminders++
    }

    // ── UNIVERSITY TRIGGERS ───────────────────────────────────────────────────
    console.log('[AGENT] Running university triggers...')

    for (const action of await triggerNewInterestAlerts()) {
      await executeUniversityAction(action); results.newInterestAlerts++
    }
    for (const action of await triggerMeetingBookedAlerts()) {
      await executeUniversityAction(action); results.meetingBookedAlerts++
    }
    for (const action of await triggerMeetingCancelledAlerts()) {
      await executeUniversityAction(action); results.meetingCancelledAlerts++
    }
    for (const action of await triggerDailyBriefs()) {
      await executeUniversityAction(action); results.dailyBriefs++
    }
    for (const action of await triggerProctorEscalations()) {
      await executeUniversityAction(action); results.proctorEscalations++
    }

    // ── FAIR TRIGGERS ─────────────────────────────────────────────────────────
    console.log('[AGENT] Running fair triggers...')
    const now = new Date()

    // ── FAIR TRIGGER 1: fair-reminder-24h ─────────────────────────────────────
    const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000)
    const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000)

    const upcomingFairs = await prisma.fairEvent.findMany({
      where: { status: 'UPCOMING', startDate: { gte: in23h, lte: in25h } },
    })

    for (const fair of upcomingFairs) {
      const dedupKey = `FAIR_REMINDER_24H:${fair.id}:${now.toISOString().slice(0, 13)}`
      const existing = await prisma.systemLog.findFirst({
        where: { type: 'FAIR_REMINDER_24H', message: { contains: dedupKey } },
      })
      if (existing) continue

      // Registered students only (walk-ins have no studentId)
      const passes = await prisma.fairStudentPass.findMany({
        where: { fairEventId: fair.id, studentId: { not: null } },
      })
      await Promise.allSettled(
        passes.map((pass) =>
          prisma.studentNotification.create({
            data: {
              studentId: pass.studentId!,
              title: `Fair tomorrow — ${fair.name}`,
              message: `Don't forget your QR pass. ${fair.venue}, ${fair.city}`,
              type: 'FAIR_REMINDER',
              isRead: false,
              actionUrl: `/fair?eventId=${fair.id}`,
            },
          })
        )
      )

      // All verified universities that opted in to fair notifications
      const universities = await prisma.university.findMany({
        where: { verificationStatus: 'VERIFIED', notifyFairOpportunities: true },
      })
      await Promise.allSettled(
        universities.map((uni) =>
          prisma.universityNotification.create({
            data: {
              universityId: uni.id,
              title: `Fair tomorrow — prepare your booth`,
              message: `${fair.name} · ${fair.venue} · ${fair.city}`,
              type: 'FAIR_REMINDER',
              isRead: false,
              actionUrl: `/event/${fair.slug}/scan`,
            },
          })
        )
      )

      await prisma.systemLog.create({
        data: {
          level: 'INFO',
          type: 'FAIR_REMINDER_24H',
          message: `[done] ${dedupKey}`,
          metadata: {
            fairId: fair.id,
            passesNotified: passes.length,
            unisNotified: universities.length,
          },
        },
      })
      results.fairReminder24h++
    }

    // ── FAIR TRIGGER 2: fair-university-followup-nudge ────────────────────────
    const h47ago = new Date(now.getTime() - 47 * 60 * 60 * 1000)
    const h49ago = new Date(now.getTime() - 49 * 60 * 60 * 1000)

    const endedFairs = await prisma.fairEvent.findMany({
      where: {
        status: 'COMPLETED',
        endedAt: { gte: h49ago, lte: h47ago },
      },
    })

    for (const fair of endedFairs) {
      const grouped = await prisma.fairAttendance.groupBy({
        by: ['universityId'],
        where: { fairEventId: fair.id, followUpStatus: 'PENDING' },
        _count: { id: true },
      })

      await Promise.allSettled(
        grouped.map(async (record) => {
          const dedupKey = `FAIR_FOLLOWUP_NUDGE:${fair.id}:${record.universityId}:${now.toISOString().slice(0, 13)}`
          const existing = await prisma.systemLog.findFirst({
            where: { type: 'FAIR_FOLLOWUP_NUDGE', message: { contains: dedupKey } },
          })
          if (existing) return

          // Must fetch full University object for email function
          const university = await prisma.university.findUnique({
            where: { id: record.universityId },
          })
          if (!university) return

          await prisma.universityNotification.create({
            data: {
              universityId: university.id,
              title: `${record._count.id} leads still need follow-up`,
              message: `Students from ${fair.name} haven't been contacted yet`,
              type: 'FAIR_FOLLOWUP_NUDGE',
              isRead: false,
              actionUrl: `/dashboard/university/fair-report/${fair.id}`,
            },
          })

          await sendFairEndReportToUniversity(university, fair, record._count.id)

          await prisma.systemLog.create({
            data: {
              level: 'INFO',
              type: 'FAIR_FOLLOWUP_NUDGE',
              message: `[done] ${dedupKey}`,
              metadata: {
                fairId: fair.id,
                universityId: university.id,
                pendingCount: record._count.id,
              },
            },
          })
        })
      )
      results.fairFollowupNudge++
    }

    // ── FAIR TRIGGER 3: fair-partial-profile-nudge ────────────────────────────
    const h71ago = new Date(now.getTime() - 71 * 60 * 60 * 1000)
    const h73ago = new Date(now.getTime() - 73 * 60 * 60 * 1000)

    const stalePasses = await prisma.fairStudentPass.findMany({
      where: {
        isPartialProfile: true,
        studentId: null,
        createdAt: { gte: h73ago, lte: h71ago },
      },
      include: { fairEvent: true },
    })

    const nudgeResults = await Promise.allSettled(
      stalePasses.map(async (pass) => {
        const dedupKey = `FAIR_PARTIAL_NUDGE:${pass.id}`
        const existing = await prisma.systemLog.findFirst({
          where: { type: 'FAIR_PARTIAL_NUDGE', message: { contains: dedupKey } },
        })
        if (existing) return

        const visitCount = await prisma.fairAttendance.count({
          where: { passId: pass.id },
        })

        await sendPartialProfileNudge(pass.email, {
          fairName: pass.fairEvent.name,
          universitiesVisited: visitCount,
        })

        await prisma.systemLog.create({
          data: {
            level: 'INFO',
            type: 'FAIR_PARTIAL_NUDGE',
            message: `[done] ${dedupKey}`,
            metadata: { passId: pass.id, visitCount },
          },
        })
      })
    )

    const nudgeSent = nudgeResults.filter((r) => r.status === 'fulfilled').length
    const nudgeFailed = nudgeResults.filter((r) => r.status === 'rejected').length
    await prisma.systemLog.create({
      data: {
        level: 'INFO',
        type: 'FAIR_PARTIAL_NUDGE_SUMMARY',
        message: `[summary] processed:${stalePasses.length} sent:${nudgeSent} failed:${nudgeFailed}`,
        metadata: { processed: stalePasses.length, sent: nudgeSent, failed: nudgeFailed },
      },
    })
    results.fairPartialNudge += nudgeSent

    // ── FAIR TRIGGER 4: fair-morning-scanner-reminder ─────────────────────────
    // Only runs between 7:00–9:00 IST (01:30–03:30 UTC)
    const utcHour = now.getUTCHours()
    const utcMinutes = now.getUTCMinutes()
    const isISTMorningWindow =
      (utcHour === 1 && utcMinutes >= 30) ||
      utcHour === 2 ||
      (utcHour === 3 && utcMinutes < 30)

    if (isISTMorningWindow) {
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)

      const liveFairs = await prisma.fairEvent.findMany({
        where: {
          status: 'LIVE',
          startDate: { lte: thirtyMinutesAgo },
        },
      })

      for (const fair of liveFairs) {
        const dedupKey = `FAIR_SCANNER_REMINDER:${fair.id}:${now.toISOString().slice(0, 13)}`
        const existing = await prisma.systemLog.findFirst({
          where: { type: 'FAIR_SCANNER_REMINDER', message: { contains: dedupKey } },
        })
        if (existing) continue

        const participatingIds = await prisma.fairAttendance.findMany({
          where: { fairEventId: fair.id },
          select: { universityId: true },
          distinct: ['universityId'],
        })

        const universities =
          participatingIds.length > 0
            ? await prisma.university.findMany({
              where: { id: { in: participatingIds.map((u) => u.universityId) } },
            })
            : await prisma.university.findMany({
              where: { verificationStatus: 'VERIFIED' },
            })

        await Promise.allSettled(
          universities.map((uni) =>
            prisma.universityNotification.create({
              data: {
                universityId: uni.id,
                title: `Fair is live — open your scanner now`,
                message: `${fair.name} is happening today at ${fair.venue}`,
                type: 'FAIR_LIVE_REMINDER',
                isRead: false,
                actionUrl: `/event/${fair.slug}/scan`,
              },
            })
          )
        )

        await prisma.systemLog.create({
          data: {
            level: 'INFO',
            type: 'FAIR_SCANNER_REMINDER',
            message: `[done] ${dedupKey}`,
            metadata: { fairId: fair.id, unisNotified: universities.length },
          },
        })
        results.fairMorningScannerReminder++
      }
    }
  } catch (error) {
    console.error('[AGENT] Fatal error during run:', error)
    results.errors++
  }

  const duration = Date.now() - startTime
  console.log(`[AGENT] Run complete in ${duration}ms`, results)

  return new Response(JSON.stringify({ ok: true, duration, results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Runs every hour at :00
export const config: Config = {
  schedule: '0 * * * *',
}
