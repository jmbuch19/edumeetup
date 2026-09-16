import type { Config } from '@netlify/functions'
import { prisma } from '../../lib/prisma'
import {
    triggerFairGoLiveNotifications,
    triggerFairEndedNotifications,
} from '../../lib/fair/notifications'

/**
 * fair-fast-agent — native Netlify Scheduled Function, every 15 minutes.
 * Netlify invokes this directly; do not require custom incoming cron headers.
 */
export default async function handler(): Promise<Response> {
    const startTime = Date.now()
    console.log(`[FAIR-FAST-AGENT] Run started at ${new Date().toISOString()}`)
    const results = { fairAutoLive: 0, fairAutoComplete: 0, errors: 0 }

    try {
        const now = new Date()
        const fairsToGoLive = await prisma.fairEvent.findMany({
            where: { status: 'UPCOMING', startDate: { lte: now } },
        })

        for (const fair of fairsToGoLive) {
            const dedupKey = `FAIR_AUTO_LIVE:${fair.id}`
            const existing = await prisma.systemLog.findFirst({
                where: { type: 'FAIR_AUTO_LIVE', message: { contains: dedupKey } },
            })
            if (existing) continue

            await prisma.fairEvent.update({ where: { id: fair.id }, data: { status: 'LIVE' } })
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
        }

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
        }
    } catch (error) {
        console.error('[FAIR-FAST-AGENT] Fatal error:', error)
        results.errors++
    }

    const duration = Date.now() - startTime
    return new Response(JSON.stringify({ ok: results.errors === 0, duration, results }), {
        status: results.errors === 0 ? 200 : 500,
        headers: { 'Content-Type': 'application/json' },
    })
}

export const config: Config = { schedule: '*/15 * * * *' }
