import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

/**
 * Fair Auto-Complete Cron
 * Transitions FairEvent records from LIVE → COMPLETED when endDate has passed.
 * Called by the fair-fast-agent Netlify function every 15 minutes.
 * Secured with CRON_SECRET bearer token.
 */
export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
        const auth = request.headers.get('Authorization')
        if (auth !== `Bearer ${cronSecret}`) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }
    }

    const now = new Date()

    try {
        const result = await prisma.fairEvent.updateMany({
            where: {
                status: 'LIVE',
                endDate: { lte: now },
            },
            data: {
                status: 'COMPLETED',
                endedAt: now,
            },
        })

        return NextResponse.json({
            success: true,
            completed: result.count,
            checkedAt: now.toISOString(),
        })
    } catch (error) {
        console.error('[fair-auto-complete] Error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
