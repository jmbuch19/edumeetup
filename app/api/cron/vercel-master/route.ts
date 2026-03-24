import { NextResponse } from 'next/server'

// By calling the individual cron routes internally as functions, 
// we bypass Vercel's 2-cron limit perfectly without duplicating logic.
import { GET as runProcessDeletions } from '../process-deletions/route'
import { GET as runTriggers } from '../triggers/route'
import { GET as runFairAutoLive } from '../fair-auto-live/route'
import { GET as runFairAutoComplete } from '../fair-auto-complete/route'
import { GET as runSessionReminders } from '../session-reminders/route'

export const maxDuration = 60 // Vercel hobby max duration for cron tasks is 60s

export async function GET(req: Request) {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
        return NextResponse.json({ error: 'Not configured' }, { status: 503 })
    }

    const authHeader = req.headers.get('Authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const minute = now.getUTCMinutes()
    const hour = now.getUTCHours()

    const results: Record<string, string> = {}

    // We pass a matching dummy request to the handlers to authorize them natively
    const dummyReq = new Request(req.url, {
        headers: { 'Authorization': `Bearer ${cronSecret}` }
    })

    // 1. FAST JOBS (Every 15 minutes) - Run on every ping
    try {
        await Promise.allSettled([
            runFairAutoLive(dummyReq as any),
            runFairAutoComplete(dummyReq as any),
            runSessionReminders(dummyReq as any)
        ])
        results.fastJobs = 'Executed 15-minute logic checks'
    } catch (e) {
        console.error('[Master Cron] Fast Job Error:', e)
    }

    // 2. HOURLY JOBS (Every Hour at :00)
    // Vercel pings at exactly :00, but we allow a 14-min window just in case of jitter
    if (minute >= 0 && minute < 15) {
        try {
            await runTriggers(dummyReq as any)
            results.hourlyJobs = 'Executed Hourly Agent triggers'
        } catch (e) {
            console.error('[Master Cron] Hourly Job Error:', e)
        }
    }

    // 3. DAILY JOBS (Every Day at 2:00 AM UTC)
    if (hour === 2 && minute >= 0 && minute < 15) {
        try {
            await runProcessDeletions(dummyReq as any)
            results.dailyJobs = 'Executed 2AM daily deletions'
        } catch (e) {
            console.error('[Master Cron] Daily Job Error:', e)
        }
    }

    return NextResponse.json({ 
        success: true, 
        timestamp: now.toISOString(),
        plan: "Hobby Master Switch",
        results 
    })
}
