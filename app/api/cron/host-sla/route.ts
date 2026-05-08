import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, generateEmailHtml } from '@/lib/email'

/**
 * GET /api/cron/host-sla
 * Schedule: 9am UTC daily (vercel.json).
 * Detects host requests still in SUBMITTED state past the 48-hour SLA
 * and sends an admin breach alert.
 */
export async function GET(request: NextRequest) {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
        return NextResponse.json({ error: 'Not configured' }, { status: 503 })
    }
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
    const recentRun = await prisma.systemLog.findFirst({
        where: { type: 'HOST_SLA_CRON_RUN', createdAt: { gte: twoHoursAgo } }
    })
    if (recentRun) {
        return NextResponse.json({ skipped: true, reason: 'Idempotency lock' })
    }

    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'

    const pending = await prisma.hostRequest.findMany({
        where: { status: 'SUBMITTED', createdAt: { lt: cutoff } }
    })

    if (pending.length > 0) {
        if (process.env.ADMIN_NOTIFICATION_EMAIL) {
            await sendEmail({
                to: process.env.ADMIN_NOTIFICATION_EMAIL,
                subject: `[SLA BREACH] ${pending.length} Host Requests > 48 Hours`,
                html: generateEmailHtml(
                    'SLA Breach Alert',
                    `<p><strong>${pending.length}</strong> campus fair requests have been awaiting review for over 48 hours.</p>
                    <p>Please review them immediately.</p>
                    <a href="${baseUrl}/admin/host-requests">Open Admin Dashboard →</a>`
                )
            })
        }

        await prisma.systemLog.create({
            data: {
                level: 'WARN',
                type: 'HOST_SLA_CRON',
                message: `${pending.length} host requests breached 48h SLA`,
                metadata: { count: pending.length }
            }
        })
    }

    await prisma.systemLog.create({
        data: {
            level: 'INFO',
            type: 'HOST_SLA_CRON_RUN',
            message: 'Host SLA Cron execution complete',
            metadata: { pendingCount: pending.length }
        }
    })

    return NextResponse.json({ success: true, breachedCount: pending.length })
}
