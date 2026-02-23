/**
 * University Domain Validation Library
 * Fetches and caches the Hipo university-domains-list, filtered to target countries.
 * Cache is built on first use (singleton) and can be refreshed via refreshDomains().
 */

const HIPO_URL =
    'https://raw.githubusercontent.com/Hipo/university-domains-list/master/world_universities_and_domains.json'

// --- Allowed alpha_two_codes ---
// Priority non-EU targets + all 27 EU member states
const ALLOWED_CODES = new Set([
    // Priority targets
    'US', 'GB', 'CA', 'AU', 'NZ', 'AE', 'IN', 'SG',
    // EU-27
    'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE',
    'ES', 'FI', 'FR', 'GR', 'HR', 'HU', 'IE', 'IT',
    'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO',
    'SE', 'SI', 'SK',
])

interface UniversityEntry {
    name: string
    country: string
    alpha_two_code: string
    domains: string[]
}

interface UniversityInfo {
    name: string
    country: string
}

// --- In-memory cache ---
let domainMap: Map<string, UniversityInfo> = new Map()
let isLoaded = false
let isLoading = false
let lastUpdated: Date | null = null

function buildMap(data: UniversityEntry[]): Map<string, UniversityInfo> {
    const map = new Map<string, UniversityInfo>()
    for (const uni of data) {
        if (!ALLOWED_CODES.has(uni.alpha_two_code)) continue
        for (const domain of uni.domains) {
            const key = domain.toLowerCase().trim()
            if (key) {
                map.set(key, { name: uni.name, country: uni.country })
            }
        }
    }
    return map
}

async function fetchAndBuild(): Promise<Map<string, UniversityInfo>> {
    const res = await fetch(HIPO_URL, { cache: 'no-store' })
    if (!res.ok) throw new Error(`Hipo fetch failed: ${res.status}`)
    const data: UniversityEntry[] = await res.json()
    return buildMap(data)
}

// Singleton initialization
async function ensureLoaded(): Promise<void> {
    if (isLoaded || isLoading) return
    isLoading = true
    try {
        domainMap = await fetchAndBuild()
        lastUpdated = new Date()
        isLoaded = true
        console.log(`[university-domains] Loaded ${domainMap.size} university domains from Hipo.`)
    } catch (err) {
        console.warn('[university-domains] Initial fetch failed:', err)
    } finally {
        isLoading = false
    }
}

// Kick off loading immediately on module import (server-side)
if (typeof window === 'undefined') {
    ensureLoaded()
}

/**
 * Re-fetch and rebuild the domain cache.
 * Called by the weekly cron endpoint.
 */
export async function refreshDomains(): Promise<{ count: number; updatedAt: string }> {
    try {
        const newMap = await fetchAndBuild()
        domainMap = newMap
        isLoaded = true
        lastUpdated = new Date()
        console.log(`[university-domains] Refreshed: ${newMap.size} domains.`)
        return { count: newMap.size, updatedAt: lastUpdated.toISOString() }
    } catch (err) {
        console.warn('[university-domains] Refresh failed, keeping existing cache:', err)
        return {
            count: domainMap.size,
            updatedAt: lastUpdated?.toISOString() ?? 'unknown',
        }
    }
}

/**
 * Extract a domain from an email address.
 */
export function extractDomain(email: string): string | null {
    const parts = email.toLowerCase().trim().split('@')
    return parts.length === 2 && parts[1] ? parts[1] : null
}

/**
 * Look up a domain (or its parent base domain) in the cached map.
 * Returns university info if found, null otherwise.
 */
export function getUniversityInfo(domain: string): UniversityInfo | null {
    const d = domain.toLowerCase().trim()

    // 1. Exact match
    if (domainMap.has(d)) return domainMap.get(d)!

    // 2. Subdomain match: walk up levels
    //    e.g. cs.ox.ac.uk → ox.ac.uk → ac.uk (stop at 2 labels)
    const labels = d.split('.')
    for (let i = 1; i < labels.length - 1; i++) {
        const base = labels.slice(i).join('.')
        if (domainMap.has(base)) return domainMap.get(base)!
    }

    return null
}

/**
 * Returns true if the domain matches a known university.
 */
export function isUniversityDomain(domain: string): boolean {
    return getUniversityInfo(domain) !== null
}

/**
 * Wait for cache to be ready (useful in API routes on cold start).
 */
export async function waitForCache(): Promise<void> {
    if (isLoaded) return
    await ensureLoaded()
}

export function getCacheStats() {
    return { count: domainMap.size, lastUpdated, isLoaded }
}
