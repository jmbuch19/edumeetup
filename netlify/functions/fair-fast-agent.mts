import type { Config } from '@netlify/functions'
import { prisma } from '../../lib/prisma'
import {
    triggerFairGoLiveNotifications,
    triggerFairEndedNotifications,
} from '../../lib/fair/notifications'

/**
 * fair-fast-agent — runs every 15 minutes
 *
 * JOB 1: fair-auto-live
 *   UPCOMING fairs whose startDate <= now → set LIVE + fire go-live notifications
 *
 * JOB 2: fair-auto-complete
 *   LIVE fairs whose endDate <= now → set COMPLETED + fire ended notifications
 *
 * Idempotency: SystemLog dedup key prevents double-processing.
 * Never throws — all errors are caught and logged.
 */
export default async function handler(req: Request): Promise<Response> {
    // ── Optional auth check (same pattern as process-deletions.mts) ────────────
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
        const auth = req.headers.get('x-cron-secret') ?? req.headers.get('Authorization')
        if (auth !== cronSecret && auth !== `Bearer ${cronSecret}`) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
        }
    }

    const startTime = Date.now()
    console.log(`[FAIR-FAST-AGENT] Run started at ${new Date().toISOString()}`)
    const results = { fairAutoLive: 0, fairAutoComplete: 0, errors: 0 }

    try {
        const now = new Date()

        // ── JOB 1: fair-auto-live ─────────────────────────────────────────────────
        const fairsToGoLive = await prisma.fairEvent.findMany({
            where: { status: 'UPCOMING', startDate: { lte: now } },
        })

        for (const fair of fairsToGoLive) {
            const dedupKey = `FAIR_AUTO_LIVE:${fair.id}`
            const existing = await prisma.systemLog.findFirst({
                where: { type: 'FAIR_AUTO_LIVE', message: { contains: dedupKey } },
            })
            if (existing) continue

            await prisma.fairEvent.update({
                where: { id: fair.id },
                data: { status: 'LIVE' },
            })

            triggerFairGoLiveNotifications(fair.id).catch(console.error)

            await prisma.systemLog.create({
                data: {
                    level: 'INFO',
                    type: 'FAIR_AUTO_LIVE',
                    message: `[done] ${dedupKey}`,
                    metadata: { fairId: fair.id, fairName: fair.name },
                },
            })
            results.fairAutoLive++
            console.log(`[FAIR-FAST-AGENT] Fair "${fair.name}" set to LIVE`)
        }

        // ── JOB 2: fair-auto-complete ─────────────────────────────────────────────
        const fairsToComplete = await prisma.fairEvent.findMany({
            where: { status: 'LIVE', endDate: { lte: now } },
        })

        for (const fair of fairsToComplete) {
            const dedupKey = `FAIR_AUTO_COMPLETE:${fair.id}`
            const existing = await prisma.systemLog.findFirst({
                where: { type: 'FAIR_AUTO_COMPLETE', message: { contains: dedupKey } },
            })
            if (existing) continue

            await prisma.fairEvent.update({
                where: { id: fair.id },
                data: { status: 'COMPLETED', endedAt: now },
            })

            triggerFairEndedNotifications(fair.id).catch(console.error)

            await prisma.systemLog.create({
                data: {
                    level: 'INFO',
                    type: 'FAIR_AUTO_COMPLETE',
                    message: `[done] ${dedupKey}`,
                    metadata: { fairId: fair.id, fairName: fair.name },
                },
            })
            results.fairAutoComplete++
            console.log(`[FAIR-FAST-AGENT] Fair "${fair.name}" set to COMPLETED`)
        }
    } catch (error) {
        console.error('[FAIR-FAST-AGENT] Fatal error:', error)
        results.errors++
    }

    const duration = Date.now() - startTime
    console.log(`[FAIR-FAST-AGENT] Complete in ${duration}ms`, results)

    return new Response(JSON.stringify({ ok: true, duration, results }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    })
}

// Runs every 15 minutes
export const config: Config = {
    schedule: '*/15 * * * *',
}
