/**
 * lib/ratelimit.ts
 *
 * Two-tier rate limiting:
 *
 * 1. PUBLIC endpoints (fair registration, login, etc.)
 *    → Upstash Redis distributed sliding window — survives cold starts,
 *      works across all Netlify function instances.
 *    ⚠️ Requires env vars: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 *       Set both in Netlify → Site Settings → Environment Variables.
 *       Get values from https://console.upstash.com (free tier)
 *
 * 2. INTERNAL server actions (interest, invite, notifications, etc.)
 *    → In-process memory limiter — lightweight, no external dep.
 *      Acceptable: these are authenticated endpoints for low-traffic use cases.
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ─── Upstash Redis client ────────────────────────────────────────────────────
// ⚠️ UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set in Netlify env vars.

function createRedis(): Redis | null {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN
    if (!url || !token) return null
    return new Redis({ url, token })
}

const redis = createRedis()

// ─── Upstash sliding-window limiters (distributed) ───────────────────────────

/**
 * Fair pass registration — 5 attempts per hour per email/IP.
 * Public unauthenticated endpoint, highest risk of abuse.
 * Falls back to in-memory if Upstash is not configured.
 */
export const fairPassUpstashLimiter = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '1 h'),
        analytics: false,
        prefix: 'rl:fair_registration',
    })
    : null

/**
 * Login magic-link requests — 5 per hour per email.
 */
export const loginUpstashLimiter = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '1 h'),
        analytics: false,
        prefix: 'rl:login',
    })
    : null

// ─── In-memory limiter (fallback + internal authenticated actions) ────────────

export class RateLimiter {
    private requests: Map<string, number[]> = new Map()
    private windowMs: number
    private maxRequests: number

    constructor(windowMs: number, maxRequests: number) {
        this.windowMs = windowMs
        this.maxRequests = maxRequests
    }

    /** Returns true if the request is allowed, false if it should be blocked. */
    check(key: string): boolean {
        const now = Date.now()
        const timestamps = this.requests.get(key) || []
        const valid = timestamps.filter(t => now - t < this.windowMs)
        if (valid.length >= this.maxRequests) return false
        valid.push(now)
        this.requests.set(key, valid)
        return true
    }
}

// Named in-memory instances — internal / authenticated endpoints only
/** 5 login attempts per 60 s (in-memory fallback — Upstash preferred) */
export const loginRateLimiter = new RateLimiter(60_000, 5)
/** 3 registration attempts per 60 s */
export const registerRateLimiter = new RateLimiter(60_000, 3)
/** 3 contact-form submissions per 60 s */
export const contactRateLimiter = new RateLimiter(60_000, 3)
/** 5 support-ticket submissions per 60 s */
export const supportRateLimiter = new RateLimiter(60_000, 5)
/** 10 interest pings per 60 s */
export const interestRateLimiter = new RateLimiter(60_000, 10)
/** 20 rep invite calls per 60 s */
export const inviteRateLimiter = new RateLimiter(60_000, 20)
/** 1 notification campaign per 6 hours per university */
export const uniNotifRateLimiter = new RateLimiter(6 * 60 * 60_000, 1)
/** 3 fair pass registrations per email per hour (in-memory fallback only — Upstash preferred) */
export const fairPassRateLimiter = new RateLimiter(60 * 60_000, 3)

// ─── Email rate-limit helper (used by lib/email.ts) ──────────────────────────

const _emailLimiter = new RateLimiter(60 * 60 * 1_000, 10)

export function checkRateLimit(key: string, limit: number = 10): boolean {
    if (limit !== 10) {
        const limiterKey = `__limiter_${limit}`
        if (!(globalThis as Record<string, unknown>)[limiterKey]) {
            (globalThis as Record<string, unknown>)[limiterKey] = new RateLimiter(60 * 60 * 1_000, limit)
        }
        return ((globalThis as Record<string, unknown>)[limiterKey] as RateLimiter).check(key)
    }
    return _emailLimiter.check(key)
}
