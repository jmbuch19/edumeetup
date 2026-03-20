import type { Config } from '@netlify/functions'
import { PrismaClient } from '@prisma/client'
import { sendEmail, generateEmailHtml } from '../../lib/email'

const prisma = new PrismaClient()

export default async function handler(request: Request) {
    // MUST be first — before prisma queries, before anything
    const incomingSecret = request.headers.get('x-cron-secret')
    if (process.env.CRON_SECRET && incomingSecret !== process.env.CRON_SECRET) {
        return new Response('Unauthorized', { status: 401 })
    }

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
    const recentRun = await prisma.systemLog.findFirst({
        where: { type: 'ALUMNI_NUDGE_CRON', createdAt: { gte: twoHoursAgo } }
    })
    if (recentRun) {
        console.log('[AlumniNudgeCron] Skipped due to idempotency lock.')
        return new Response('Already ran recently', { status: 200 })
    }

    console.log('[AlumniNudgeCron] Starting scheduled run...')
    
    // 60 days ago
    const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)

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
            take: 100, // batch cap per run
        })

        console.log(`[AlumniNudgeCron] Found ${alumni.length} alumni to nudge.`)

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
                    <a href="${process.env.NEXTAUTH_URL || 'https://edumeetup.com'}/alumni/dashboard" 
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
                metadata: { count: alumni.length, runAt: new Date() }
            }
        })

        console.log('[AlumniNudgeCron] Run completed successfully.')
        return new Response('OK', { status: 200 })
        
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
        
        return new Response('Internal Server Error', { status: 500 })
    } finally {
        await prisma.$disconnect()
    }
}

export const config: Config = { schedule: '0 9 1 */2 *' }
