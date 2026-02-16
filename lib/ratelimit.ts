export class RateLimiter {
    private requests: Map<string, number[]> = new Map()
    private windowMs: number
    private maxRequests: number

    constructor(windowMs: number, maxRequests: number) {
        this.windowMs = windowMs
        this.maxRequests = maxRequests
    }

    check(key: string): boolean {
        const now = Date.now()
        const timestamps = this.requests.get(key) || []

        // Filter out old timestamps
        const validTimestamps = timestamps.filter(t => now - t < this.windowMs)

        if (validTimestamps.length >= this.maxRequests) {
            return false
        }

        validTimestamps.push(now)
        this.requests.set(key, validTimestamps)

        // Cleanup periodically could be added here or via separate process
        // For MVP, simple memory map is fine. 
        // In serverless/Vercel, memory is not shared across lambdas, 
        // so this is per-lambda instance.
        // For strict global rate limiting, use Redis/Upstash.

        return true
    }
}

// Global instances (best effort for serverless)
// Allow 5 login attempts per 1 minute
export const loginRateLimiter = new RateLimiter(60 * 1000, 5)

// Allow 3 registration attempts per 1 minute (prevent spam bots)
export const registerRateLimiter = new RateLimiter(60 * 1000, 3)

// [NEW] Rate Limiters
export const contactRateLimiter = new RateLimiter(60 * 1000, 3)
export const supportRateLimiter = new RateLimiter(60 * 1000, 5)
export const interestRateLimiter = new RateLimiter(60 * 1000, 10)
export const inviteRateLimiter = new RateLimiter(60 * 1000, 20) 
