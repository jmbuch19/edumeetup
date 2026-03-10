/**
 * bot-health-check.mts
 * Runs every hour — checks for bot silent failures and alerts admin via email.
 *
 * Silent failure taxonomy:
 *   SF-1 streamEmpty   — Groq error after headers committed (no tokens)
 *   SF-3 redisOk=false — Upstash Redis auth/network failure
 *   SF-4 BOT_ERROR 429 — Groq rate limit exhausted
 *   SF-6 likelyTruncated — reply < 10 output tokens
 */

import type { Config } from '@netlify/functions'
import { prisma } from '../../lib/prisma'
import { sendEmail, generateEmailHtml } from '../../lib/email'

const ADMIN_EMAIL = process.env.ADMIN_ALERT_EMAIL || process.env.EMAIL_FROM || 'admin@edumeetup.com'
const APP_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'

// Alert thresholds
const EMPTY_STREAM_RATE_THRESHOLD = 0.20  // 20% of turns produce no output
const REDIS_FAILURE_THRESHOLD = 1         // any Redis failure triggers alert
const TRUNCATED_RATE_THRESHOLD = 0.15     // 15% of turns likely truncated

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

export default async function handler() {
    const runStart = Date.now()
    console.log(`[BOT HEALTH] Check started at ${new Date().toISOString()}`)

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

    try {
        // ── Query last hour of BOT_TRACE logs ─────────────────────────────────────
        const [total, emptyStream, redisFailures, groq429s, truncated] = await Promise.allSettled([

            // Total bot turns in the last hour
            prisma.systemLog.count({
                where: { type: 'BOT_TRACE', createdAt: { gte: oneHourAgo } }
            }),

            // SF-1: Empty stream (streamEmpty = true)
            prisma.systemLog.count({
                where: {
                    type: 'BOT_TRACE',
                    createdAt: { gte: oneHourAgo },
                    metadata: { path: ['streamEmpty'], equals: true }
                }
            }),

            // SF-3: Redis failures (redisOk = false)
            prisma.systemLog.count({
                where: {
                    type: 'BOT_TRACE',
                    createdAt: { gte: oneHourAgo },
                    metadata: { path: ['redisOk'], equals: false }
                }
            }),

            // SF-4: Groq 429 errors logged as BOT_ERROR
            prisma.systemLog.count({
                where: {
                    type: 'BOT_ERROR',
                    createdAt: { gte: oneHourAgo },
                    message: { contains: '429' }
                }
            }),

            // SF-6: Likely truncated (likelyTruncated = true)
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

        console.log('[BOT HEALTH] Results:', {
            totalCount, emptyCount, redisCount, groqCount, truncCount,
            emptyRate: `${Math.round(emptyRate * 100)}%`,
            truncRate: `${Math.round(truncRate * 100)}%`,
        })

        // Log the health summary regardless of alerts
        await prisma.systemLog.create({
            data: {
                level: 'INFO',
                type: 'BOT_HEALTH_CHECK',
                message: `health check: ${totalCount} turns, ${Math.round(emptyRate * 100)}% empty, ${redisCount} redis failures`,
                metadata: { totalCount, emptyCount, redisCount, groqCount, truncCount, emptyRate, truncRate }
            }
        }).catch(() => { })

        // No turns yet this hour — nothing to alert on
        if (totalCount === 0) {
            console.log('[BOT HEALTH] No turns this hour — skipping alert checks')
            const duration = Date.now() - runStart
            return new Response(JSON.stringify({ ok: true, duration, totalCount }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // ── SF-1: Empty stream rate too high ──────────────────────────────────────
        if (emptyRate > EMPTY_STREAM_RATE_THRESHOLD) {
            await sendAlert(
                `⚠️ Bot empty stream rate: ${Math.round(emptyRate * 100)}%`,
                `<strong>${emptyCount}/${totalCount}</strong> bot turns produced no output in the last hour (threshold: ${Math.round(EMPTY_STREAM_RATE_THRESHOLD * 100)}%).<br/><br/>
         Possible causes: Groq streaming failure, cold-start timeout, or model unavailability.`
            )
        }

        // ── SF-3: Redis auth/network failures ────────────────────────────────────
        if (redisCount >= REDIS_FAILURE_THRESHOLD) {
            await sendAlert(
                `🔴 Bot Redis failures: ${redisCount} in last hour`,
                `<strong>${redisCount}</strong> bot requests encountered a Redis failure (rate-limiting and quota enforcement degraded).<br/><br/>
         Check: <code>UPSTASH_REDIS_REST_TOKEN</code> and <code>UPSTASH_REDIS_REST_URL</code> in Netlify environment variables.`
            )
        }

        // ── SF-4: Groq 429 rate limit ─────────────────────────────────────────────
        if (groqCount > 0) {
            await sendAlert(
                `🔴 Groq 429 rate limit hit: ${groqCount} times`,
                `The bot hit Groq's free-tier rate limit <strong>${groqCount}</strong> time(s) in the last hour. Students may be seeing error messages.<br/><br/>
         Consider upgrading the Groq plan or implementing request queuing.`
            )
        }

        // ── SF-6: Truncation rate ─────────────────────────────────────────────────
        if (truncRate > TRUNCATED_RATE_THRESHOLD) {
            await sendAlert(
                `⚠️ Bot truncation rate: ${Math.round(truncRate * 100)}%`,
                `<strong>${truncCount}/${totalCount}</strong> bot replies appear truncated (< 10 output tokens, non-empty stream) in the last hour.<br/><br/>
         Possible cause: model context limit exceeded or token quota pressure.`
            )
        }

        const duration = Date.now() - runStart
        console.log(`[BOT HEALTH] Check complete in ${duration}ms`)
        return new Response(JSON.stringify({ ok: true, duration, totalCount, emptyRate, redisCount }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        })

    } catch (error) {
        console.error('[BOT HEALTH] Fatal error:', error)
        return new Response(JSON.stringify({ ok: false, error: String(error) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}

// Runs every hour at :15 (staggered from agent.mts which runs at :00)
export const config: Config = {
    schedule: '15 * * * *',
}
