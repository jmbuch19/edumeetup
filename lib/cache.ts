/**
 * lib/cache.ts — Thin Redis cache wrapper using @upstash/redis
 *
 * Design principles:
 *  - Redis failure NEVER breaks the app. If Redis is down/unavailable,
 *    withCache() falls back to calling the fetcher directly (live DB).
 *  - TTL-based invalidation only — simple, predictable, no manual purging needed.
 *  - Zero config required beyond existing UPSTASH_REDIS_REST_URL + TOKEN env vars.
 */

import { Redis } from '@upstash/redis'

// Lazily initialise Redis — if env vars are missing, gracefully degrade
let redis: Redis | null = null

function getRedis(): Redis | null {
    if (redis) return redis
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN
    if (!url || !token) return null
    try {
        redis = new Redis({ url, token })
        return redis
    } catch {
        return null
    }
}

/**
 * Cache-aside helper.
 *
 * @param key     Unique cache key string
 * @param ttl     Cache TTL in seconds (e.g. 60 = 1 minute)
 * @param fetcher Async function that returns fresh data from the DB
 *
 * Usage:
 *   const slides = await withCache('homepage:slides', 60, () =>
 *     prisma.sponsoredContent.findMany({ ... })
 *   )
 */
export async function withCache<T>(
    key: string,
    ttl: number,
    fetcher: () => Promise<T>
): Promise<T> {
    const client = getRedis()

    // No Redis → go straight to DB
    if (!client) return fetcher()

    try {
        // 1. Try cache first
        const cached = await client.get<T>(key)
        if (cached !== null && cached !== undefined) {
            return cached
        }

        // 2. Cache miss → fetch from DB
        const fresh = await fetcher()

        // 3. Store in cache (fire-and-forget — don't await, don't block the response)
        client.set(key, fresh, { ex: ttl }).catch(() => {
            // Silently swallow Redis write errors — data still served correctly
        })

        return fresh
    } catch {
        // Redis read error → fall back to live DB, don't crash
        return fetcher()
    }
}

/**
 * Manually invalidate a cache key (call after writes/mutations).
 * Safe to call even if Redis is unavailable.
 */
export async function invalidateCache(key: string): Promise<void> {
    const client = getRedis()
    if (!client) return
    try {
        await client.del(key)
    } catch {
        // Swallow — stale cache will expire naturally via TTL
    }
}
