import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, generateEmailHtml } from '@/lib/email'

/**
 * GET /api/cron/bot-health-check
 * Schedule: every hour at :15 (vercel.json).
 * Scans the previous hour of BOT_TRACE / BOT_ERROR logs for silent failures
 * and emails an admin alert when thresholds are breached.
 *
 * Silent failure taxonomy:
 *   SF-1 streamEmpty   — Groq error after headers committed (no tokens)
 *   SF-3 redisOk=false — Upstash Redis auth/network failure
 *   SF-4 BOT_ERROR 429 — Groq rate limit exhausted
 *   SF-6 likelyTruncated — reply < 10 output tokens
 */

const ADMIN_EMAIL = process.env.ADMIN_ALERT_EMAIL || process.env.EMAIL_FROM || 'admin@edumeetup.com'
const APP_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'

const EMPTY_STREAM_RATE_THRESHOLD = 0.20
const REDIS_FAILURE_THRESHOLD = 1
const TRUNCATED_RATE_THRESHOLD = 0.15

async function sendAlert(subject: string, body: string) {
    await sendEmail({
        to: ADMIN_EMAIL,
        subject: `[EdUmeetup Bot Alert] ${subject}`,
        html: generateEmailHtml(subject, `
            <p>${body}</p>
            <p style="margin-top:20px;">
                <a href="${APP_URL}/admin/system-logs" class="btn">View System Logs →</a>
            </p>
            <p style="font-size:12px;color:#94a3b8;margin-top:16px;">
                This is an automated alert from the EdUmeetup bot health monitor.<br/>
                Triggered at ${new Date().toISOString()}
            </p>
        `),
    }).catch(e => console.error('[bot-health] Failed to send alert email:', e))
}

export async function GET(request: NextRequest) {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
        return NextResponse.json({ error: 'Not configured' }, { status: 503 })
    }
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const runStart = Date.now()
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

    try {
        const [total, emptyStream, redisFailures, groq429s, truncated] = await Promise.allSettled([
            prisma.systemLog.count({
                where: { type: 'BOT_TRACE', createdAt: { gte: oneHourAgo } }
            }),
            prisma.systemLog.count({
                where: {
                    type: 'BOT_TRACE',
                    createdAt: { gte: oneHourAgo },
                    metadata: { path: ['streamEmpty'], equals: true }
                }
            }),
            prisma.systemLog.count({
                where: {
                    type: 'BOT_TRACE',
                    createdAt: { gte: oneHourAgo },
                    metadata: { path: ['redisOk'], equals: false }
                }
            }),
            prisma.systemLog.count({
                where: {
                    type: 'BOT_ERROR',
                    createdAt: { gte: oneHourAgo },
                    message: { contains: '429' }
                }
            }),
            prisma.systemLog.count({
                where: {
                    type: 'BOT_TRACE',
                    createdAt: { gte: oneHourAgo },
                    metadata: { path: ['likelyTruncated'], equals: true }
                }
            }),
        ])

        const totalCount = total.status === 'fulfilled' ? total.value : 0
        const emptyCount = emptyStream.status === 'fulfilled' ? emptyStream.value : 0
        const redisCount = redisFailures.status === 'fulfilled' ? redisFailures.value : 0
        const groqCount = groq429s.status === 'fulfilled' ? groq429s.value : 0
        const truncCount = truncated.status === 'fulfilled' ? truncated.value : 0

        const emptyRate = totalCount > 0 ? emptyCount / totalCount : 0
        const truncRate = totalCount > 0 ? truncCount / totalCount : 0

        await prisma.systemLog.create({
            data: {
                level: 'INFO',
                type: 'BOT_HEALTH_CHECK',
                message: `health check: ${totalCount} turns, ${Math.round(emptyRate * 100)}% empty, ${redisCount} redis failures`,
                metadata: { totalCount, emptyCount, redisCount, groqCount, truncCount, emptyRate, truncRate }
            }
        }).catch(() => { })

        if (totalCount === 0) {
            const duration = Date.now() - runStart
            return NextResponse.json({ ok: true, duration, totalCount })
        }

        if (emptyRate > EMPTY_STREAM_RATE_THRESHOLD) {
            await sendAlert(
                `⚠️ Bot empty stream rate: ${Math.round(emptyRate * 100)}%`,
                `<strong>${emptyCount}/${totalCount}</strong> bot turns produced no output in the last hour (threshold: ${Math.round(EMPTY_STREAM_RATE_THRESHOLD * 100)}%).<br/><br/>
                Possible causes: Groq streaming failure, cold-start timeout, or model unavailability.`
            )
        }

        if (redisCount >= REDIS_FAILURE_THRESHOLD) {
            await sendAlert(
                `🔴 Bot Redis failures: ${redisCount} in last hour`,
                `<strong>${redisCount}</strong> bot requests encountered a Redis failure (rate-limiting and quota enforcement degraded).<br/><br/>
                Check: <code>UPSTASH_REDIS_REST_TOKEN</code> and <code>UPSTASH_REDIS_REST_URL</code> in Vercel environment variables.`
            )
        }

        if (groqCount > 0) {
            await sendAlert(
                `🔴 Groq 429 rate limit hit: ${groqCount} times`,
                `The bot hit Groq's free-tier rate limit <strong>${groqCount}</strong> time(s) in the last hour. Students may be seeing error messages.<br/><br/>
                Consider upgrading the Groq plan or implementing request queuing.`
            )
        }

        if (truncRate > TRUNCATED_RATE_THRESHOLD) {
            await sendAlert(
                `⚠️ Bot truncation rate: ${Math.round(truncRate * 100)}%`,
                `<strong>${truncCount}/${totalCount}</strong> bot replies appear truncated (< 10 output tokens, non-empty stream) in the last hour.<br/><br/>
                Possible cause: model context limit exceeded or token quota pressure.`
            )
        }

        const duration = Date.now() - runStart
        return NextResponse.json({ ok: true, duration, totalCount, emptyRate, redisCount })
    } catch (error) {
        console.error('[BOT HEALTH] Fatal error:', error)
        return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
    }
}
