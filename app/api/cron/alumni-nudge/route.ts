import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, generateEmailHtml } from '@/lib/email'

/**
 * GET /api/cron/alumni-nudge
 * Schedule: 9am UTC on the 1st of every other month (vercel.json).
 * Nudges verified, non-suspended alumni who haven't been nudged in 60+ days
 * to refresh their profile.
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
        where: { type: 'ALUMNI_NUDGE_CRON', createdAt: { gte: twoHoursAgo } }
    })
    if (recentRun) {
        return NextResponse.json({ skipped: true, reason: 'Idempotency lock' })
    }

    const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://edumeetup.com'

    try {
        const alumni = await prisma.alumni.findMany({
            where: {
                isVerified: true,
                adminReviewStatus: { not: 'SUSPENDED' },
                OR: [
                    { lastProfileNudgeAt: null },
                    { lastProfileNudgeAt: { lt: cutoff } }
                ]
            },
            include: { user: { select: { email: true, name: true } } },
            take: 100,
        })

        for (const alum of alumni) {
            if (!alum.user?.email) continue

            await sendEmail({
                to: alum.user.email,
                subject: `Quick check-in — has anything changed for you? 👋`,
                html: generateEmailHtml(
                    'A quick check-in from EdUmeetup',
                    `
                    <p>Hi ${alum.user.name?.split(' ')[0] ?? 'there'},</p>
                    <p>Hope things are going well! It's been a while since your EdUmeetup profile was last updated.</p>
                    <p>Has anything changed — new job, OPT approved, started a PhD, or moved to a new city? Keeping your profile current means students who look up to you always see your real journey.</p>
                    <p><strong>It takes 2 minutes.</strong></p>
                    <a href="${baseUrl}/alumni/dashboard"
                       style="display:inline-block;background:#C9A84C;color:#0B1340;padding:12px 24px;border-radius:24px;font-weight:bold;text-decoration:none">
                      Update My Profile →
                    </a>
                    <p style="margin-top:24px;color:#666;font-size:12px">
                      You're helping more students than you know.
                    </p>
                    `
                )
            })

            await prisma.alumni.update({
                where: { id: alum.id },
                data: { lastProfileNudgeAt: new Date() }
            })
        }

        await prisma.systemLog.create({
            data: {
                level: 'INFO',
                type: 'ALUMNI_NUDGE_CRON',
                message: `Alumni nudge sent to ${alumni.length} alumni`,
                metadata: { count: alumni.length, runAt: new Date().toISOString() }
            }
        })

        return NextResponse.json({ success: true, nudged: alumni.length })
    } catch (error) {
        console.error('[AlumniNudgeCron] Error during run:', error)
        await prisma.systemLog.create({
            data: {
                level: 'ERROR',
                type: 'ALUMNI_NUDGE_CRON',
                message: 'Failed to run alumni nudge cron',
                metadata: { error: '[REDACTED ERROR LOG]' }
            }
        })
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
