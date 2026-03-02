import { NextResponse } from 'next/server'
import {
    triggerProfileCompletion,
    triggerInactiveNudge,
    triggerUniversityResponseDelay,
    triggerMeetingReminders,
} from '@/lib/agent/triggers'
import { executeActions } from '@/lib/agent/executor'

/**
 * Hourly Agent Cron
 *
 * Runs all four triggers every hour.
 * Trigger layer: pure DB queries → AgentAction[]
 * Executor layer: emails, notifications, AuditLog writes
 *
 * Secured with CRON_SECRET bearer token.
 */
export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
        return NextResponse.json({ error: 'Not configured' }, { status: 503 })
    }
    if (request.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results: Record<string, { succeeded: number; failed: number; errors: string[] }> = {}

    // Collect actions from each trigger independently
    const [profileActions, nudgeActions, responseDelayActions, meetingActions] = await Promise.allSettled([
        triggerProfileCompletion(),
        triggerInactiveNudge(),
        triggerUniversityResponseDelay(),
        triggerMeetingReminders(),
    ])

    // Execute each trigger's actions, capturing results separately
    if (profileActions.status === 'fulfilled') {
        results.profileComplete = await executeActions(profileActions.value)
    } else {
        console.error('[Triggers Cron] T1 query failed:', profileActions.reason)
        results.profileComplete = { succeeded: 0, failed: 1, errors: [String(profileActions.reason)] }
    }

    if (nudgeActions.status === 'fulfilled') {
        results.inactiveNudge = await executeActions(nudgeActions.value)
    } else {
        console.error('[Triggers Cron] T2 query failed:', nudgeActions.reason)
        results.inactiveNudge = { succeeded: 0, failed: 1, errors: [String(nudgeActions.reason)] }
    }

    if (responseDelayActions.status === 'fulfilled') {
        results.responseDelay = await executeActions(responseDelayActions.value)
    } else {
        console.error('[Triggers Cron] T3 query failed:', responseDelayActions.reason)
        results.responseDelay = { succeeded: 0, failed: 1, errors: [String(responseDelayActions.reason)] }
    }

    if (meetingActions.status === 'fulfilled') {
        results.meetingReminders = await executeActions(meetingActions.value)
    } else {
        console.error('[Triggers Cron] T4 query failed:', meetingActions.reason)
        results.meetingReminders = { succeeded: 0, failed: 1, errors: [String(meetingActions.reason)] }
    }

    const totalSucceeded = Object.values(results).reduce((s, r) => s + r.succeeded, 0)
    const totalFailed = Object.values(results).reduce((s, r) => s + r.failed, 0)

    return NextResponse.json({ success: true, totalSucceeded, totalFailed, results })
}
