// lib/bot/quota.ts
// Pure quota logic for the EdUmeetup bot.
// All limits enforced server-side via Upstash Redis + session.

import { Redis } from '@upstash/redis'

// Lazy singleton — Redis.fromEnv() is called on first use, never at module load.
// This prevents the entire chat function from crashing if env vars are missing/misconfigured.
let _redis: Redis | null = null
function getRedis(): Redis {
    if (!_redis) {
        _redis = Redis.fromEnv()
    }
    return _redis
}

// ── Limits ───────────────────────────────────────────────────────────────────
export const ANON_VISIT_LIMITS = [30, 15, 5, 0] // messages per visit (visit index 0,1,2,3+)
export const REGISTERED_DAILY_LIMIT = 50
export const REGISTERED_COOLDOWN_HOURS = 48

// ── Redis key helpers ─────────────────────────────────────────────────────────
const visitCountKey = (ip: string) => `bot:anon:visits:${ip}`      // how many "sessions" this IP has started
const cooldownKey   = (ip: string) => `bot:anon:cooldown:${ip}`    // unix timestamp when cooldown ends
const anonMsgKey    = (ip: string) => `bot:anon:msgs:${ip}`        // messages used in current anon session
const regMsgKey     = (userId: string, date: string) => `bot:reg:msgs:${userId}:${date}`

// ── Types ─────────────────────────────────────────────────────────────────────
export type QuotaStatus =
    | { allowed: true; remaining: number; isRegistered: boolean; dailyLimit: number }
    | { allowed: false; reason: 'anon_limit'; visitNumber: number; registrationUrl: string }
    | { allowed: false; reason: 'anon_cooldown'; cooldownEndsAt: number; visitNumber: number }
    | { allowed: false; reason: 'registered_limit'; cooldownEndsAt: number }

// ── Main quota check ──────────────────────────────────────────────────────────
export async function getQuotaStatus(ip: string, userId?: string | null): Promise<QuotaStatus> {
    const redis = getRedis()

    // ── Registered users ──────────────────────────────────────────────────────
    if (userId) {
        const date = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
        const key = regMsgKey(userId, date)
        const used = await redis.get<number>(key) ?? 0

        if (used >= REGISTERED_DAILY_LIMIT) {
            // Cooldown ends at next day + cooldown hours
            const cooldownEndsAt = Date.now() + REGISTERED_COOLDOWN_HOURS * 60 * 60 * 1000
            return { allowed: false, reason: 'registered_limit', cooldownEndsAt }
        }
        return {
            allowed: true,
            remaining: REGISTERED_DAILY_LIMIT - used,
            isRegistered: true,
            dailyLimit: REGISTERED_DAILY_LIMIT,
        }
    }

    // ── Anonymous users ───────────────────────────────────────────────────────

    // 1. Check if currently in cooldown
    const cooldownEnd = await redis.get<number>(cooldownKey(ip))
    if (cooldownEnd && Date.now() < cooldownEnd) {
        const visitNumber = await redis.get<number>(visitCountKey(ip)) ?? 1
        return { allowed: false, reason: 'anon_cooldown', cooldownEndsAt: cooldownEnd, visitNumber }
    }

    // 2. Get visit count (how many times they've hit the limit)
    const visitNumber = await redis.get<number>(visitCountKey(ip)) ?? 0

    // 3. Determine message limit for this visit tier
    const tierIndex = Math.min(visitNumber, ANON_VISIT_LIMITS.length - 1)
    const sessionLimit = ANON_VISIT_LIMITS[tierIndex]

    // 4. Permanent gate (visit 3+)
    if (sessionLimit === 0) {
        return { allowed: false, reason: 'anon_limit', visitNumber, registrationUrl: '/student/register' }
    }

    // 5. Check messages used in current anon session
    const used = await redis.get<number>(anonMsgKey(ip)) ?? 0
    if (used >= sessionLimit) {
        return { allowed: false, reason: 'anon_limit', visitNumber, registrationUrl: '/student/register' }
    }

    return {
        allowed: true,
        remaining: sessionLimit - used,
        isRegistered: false,
        dailyLimit: sessionLimit,
    }
}

// ── Consume one message ───────────────────────────────────────────────────────
export async function consumeMessage(ip: string, userId?: string | null): Promise<void> {
    const redis = getRedis()
    if (userId) {
        const date = new Date().toISOString().slice(0, 10)
        const key = regMsgKey(userId, date)
        await redis.incr(key)
        await redis.expire(key, REGISTERED_COOLDOWN_HOURS * 60 * 60) // TTL = cooldown period
    } else {
        const key = anonMsgKey(ip)
        await redis.incr(key)
        await redis.expire(key, 30 * 24 * 60 * 60) // 30 day TTL — session persists
    }
}

// ── Record that user hit the limit (start cooldown, increment visit counter) ──
export async function recordLimitHit(ip: string, visitNumber: number): Promise<void> {
    const redis = getRedis()
    // Escalating cooldown durations
    const cooldownHours = visitNumber === 0 ? 48 : visitNumber === 1 ? 168 : 720 // 48h, 7d, 30d
    const cooldownEndsAt = Date.now() + cooldownHours * 60 * 60 * 1000

    await Promise.all([
        redis.set(cooldownKey(ip), cooldownEndsAt, { ex: cooldownHours * 60 * 60 }),
        redis.set(visitCountKey(ip), visitNumber + 1, { ex: 90 * 24 * 60 * 60 }), // 90-day TTL
        redis.del(anonMsgKey(ip)), // reset session message count for next visit
    ])
}
