import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

class InMemoryRateLimiter {
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

        return true
    }
}

export class RateLimiter {
    private inMemoryLimiter?: InMemoryRateLimiter
    private upstashLimiter?: Ratelimit
    private useRedis: boolean = false

    constructor(windowMs: number, maxRequests: number) {
        // Check for Upstash credentials
        if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
            try {
                const redis = new Redis({
                    url: process.env.UPSTASH_REDIS_REST_URL,
                    token: process.env.UPSTASH_REDIS_REST_TOKEN,
                })

                // Convert windowMs to seconds
                const windowSeconds = Math.ceil(windowMs / 1000);
                // Ensure at least 1 second
                const duration = Math.max(1, windowSeconds);

                this.upstashLimiter = new Ratelimit({
                    redis: redis,
                    limiter: Ratelimit.slidingWindow(maxRequests, `${duration} s`),
                    analytics: true,
                    prefix: "@upstash/ratelimit",
                });
                this.useRedis = true;
            } catch (error) {
                console.warn('Failed to initialize Upstash Redis, falling back to in-memory rate limiting', error);
                this.useRedis = false;
            }
        }

        if (!this.useRedis) {
            this.inMemoryLimiter = new InMemoryRateLimiter(windowMs, maxRequests);
        }
    }

    async check(key: string): Promise<boolean> {
        if (this.useRedis && this.upstashLimiter) {
            try {
                const { success } = await this.upstashLimiter.limit(key);
                return success;
            } catch (error) {
                console.error('Rate limiting error, allowing request:', error);
                // If Redis fails, allow request to avoid blocking legitimate users
                return true;
            }
        } else if (this.inMemoryLimiter) {
            return this.inMemoryLimiter.check(key);
        }

        return true;
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
