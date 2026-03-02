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
} from '../../lib/agent/university-triggers'
import { executeUniversityAction } from '../../lib/agent/university-executor'

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
