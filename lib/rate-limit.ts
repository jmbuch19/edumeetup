import { LRUCache } from 'lru-cache'

// Configure cache: store up to 500 items, TTL 1 hour (3600000 ms)
const rateLimitCache = new LRUCache<string, number>({
    max: 500,
    ttl: 1000 * 60 * 60, // 1 hour
})

export function checkRateLimit(key: string, limit: number = 5): boolean {
    const currentUsage = rateLimitCache.get(key) || 0

    if (currentUsage >= limit) {
        return false // Limit exceeded
    }

    rateLimitCache.set(key, currentUsage + 1)
    return true // Allowed
}
