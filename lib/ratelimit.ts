/**
 * Unified rate-limiting module.
 *
 * ⚠️  All instances are in-process memory — effective on a single serverless
 * lambda instance.  For cross-instance enforcement, swap to Redis/Upstash.
 */

// ---------------------------------------------------------------------------
// Sliding-window RateLimiter class (used for server actions)
// ---------------------------------------------------------------------------

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

        // Discard timestamps outside the window
        const valid = timestamps.filter(t => now - t < this.windowMs)

        if (valid.length >= this.maxRequests) {
            return false
        }

        valid.push(now)
        this.requests.set(key, valid)
        return true
    }
}

// ---------------------------------------------------------------------------
// Named instances used by server actions (app/actions.ts, etc.)
// ---------------------------------------------------------------------------

/** 5 login attempts per 60 s */
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

// ---------------------------------------------------------------------------
// Functional helper used by lib/email.ts (replaces the old lib/rate-limit.ts)
// ---------------------------------------------------------------------------

/**
 * Lightweight per-key counter with a 1-hour sliding window.
 * Useful for per-recipient email rate limiting.
 *
 * @param key   Unique string key (e.g. `"email:user@example.com"`)
 * @param limit Maximum calls allowed within the window
 * @returns     true = allowed, false = blocked
 */
const _emailLimiter = new RateLimiter(60 * 60 * 1_000, 10) // 10 per hour default

export function checkRateLimit(key: string, limit: number = 10): boolean {
    // For custom limits we build an ephemeral limiter the first time,
    // keyed off the limit value so different callers don't share windows.
    if (limit !== 10) {
        const limiterKey = `__limiter_${limit}`
        if (!(globalThis as any)[limiterKey]) {
            (globalThis as any)[limiterKey] = new RateLimiter(60 * 60 * 1_000, limit)
        }
        return (globalThis as any)[limiterKey].check(key)
    }
    return _emailLimiter.check(key)
}
