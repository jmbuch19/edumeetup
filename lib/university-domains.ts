/**
 * University Domain Validation Library
 * 
 * - Fetches Hipo university-domains-list (filtered to target countries) → O(1) Map
 * - Fetches disposable-email-domains blocklist → Set
 * - Both are cached in-memory as singletons and refreshed weekly via the cron endpoint
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const HIPO_URL =
    'https://raw.githubusercontent.com/Hipo/university-domains-list/master/world_universities_and_domains.json'

const DISPOSABLE_URL =
    'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/master/domains.txt'

/** Hard-coded fallback blocklist in case the remote fetch fails */
const HARDCODED_BLOCKED = new Set([
    'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.in', 'yahoo.co.uk',
    'hotmail.com', 'hotmail.co.uk', 'outlook.com', 'outlook.in', 'live.com',
    'icloud.com', 'me.com', 'mac.com', 'proton.me', 'protonmail.com',
    'yandex.com', 'yandex.ru', 'mail.ru', 'qq.com', '163.com', '126.com',
    'sina.com', 'rediffmail.com', 'zoho.com', 'aol.com', 'gmx.com',
    'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
    'sharklasers.com', 'trashmail.com', 'dispostable.com', 'yopmail.com',
    'getairmail.com', 'spam4.me', 'fakeinbox.com', 'maildrop.cc',
])

const ALLOWED_CODES = new Set([
    // Priority targets
    'US', 'GB', 'CA', 'AU', 'NZ', 'AE', 'IN', 'SG',
    // EU-27
    'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE',
    'ES', 'FI', 'FR', 'GR', 'HR', 'HU', 'IE', 'IT',
    'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO',
    'SE', 'SI', 'SK',
])

// ─── Types ───────────────────────────────────────────────────────────────────

interface HipoEntry {
    name: string
    country: string
    alpha_two_code: string
    domains: string[]
}

export interface UniversityInfo {
    name: string
    country: string
}

// ─── In-memory caches ─────────────────────────────────────────────────────────

let domainMap: Map<string, UniversityInfo> = new Map()
let disposableSet: Set<string> = new Set(HARDCODED_BLOCKED)

let isUniversityLoaded = false
let isDisposableLoaded = false
let isLoading = false
let lastUpdated: Date | null = null

// ─── Build helpers ────────────────────────────────────────────────────────────

function buildUniversityMap(data: HipoEntry[]): Map<string, UniversityInfo> {
    const map = new Map<string, UniversityInfo>()
    for (const uni of data) {
        if (!ALLOWED_CODES.has(uni.alpha_two_code)) continue
        for (const domain of uni.domains) {
            const key = domain.toLowerCase().trim()
            if (key) map.set(key, { name: uni.name, country: uni.country })
        }
    }
    return map
}

function buildDisposableSet(text: string): Set<string> {
    const base = new Set(HARDCODED_BLOCKED)
    for (const line of text.split('\n')) {
        const d = line.trim().toLowerCase()
        if (d && !d.startsWith('#')) base.add(d)
    }
    return base
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchUniversityMap(): Promise<Map<string, UniversityInfo>> {
    const res = await fetch(HIPO_URL, { cache: 'no-store' })
    if (!res.ok) throw new Error(`Hipo fetch failed: ${res.status}`)
    const data: HipoEntry[] = await res.json()
    return buildUniversityMap(data)
}

async function fetchDisposableSet(): Promise<Set<string>> {
    const res = await fetch(DISPOSABLE_URL, { cache: 'no-store' })
    if (!res.ok) throw new Error(`Disposable domain list fetch failed: ${res.status}`)
    const text = await res.text()
    return buildDisposableSet(text)
}

// ─── Singleton initialisation ─────────────────────────────────────────────────

async function ensureLoaded(): Promise<void> {
    if ((isUniversityLoaded && isDisposableLoaded) || isLoading) return
    isLoading = true
    try {
        const [uniMap, dispSet] = await Promise.allSettled([
            fetchUniversityMap(),
            fetchDisposableSet(),
        ])

        if (uniMap.status === 'fulfilled') {
            domainMap = uniMap.value
            isUniversityLoaded = true
            console.log(`[university-domains] Loaded ${domainMap.size} university domains.`)
        } else {
            console.warn('[university-domains] University list fetch failed:', uniMap.reason)
        }

        if (dispSet.status === 'fulfilled') {
            disposableSet = dispSet.value
            isDisposableLoaded = true
            console.log(`[university-domains] Loaded ${disposableSet.size} disposable domains.`)
        } else {
            console.warn('[university-domains] Disposable list fetch failed (using hardcoded fallback):', dispSet.reason)
        }

        lastUpdated = new Date()
    } finally {
        isLoading = false
    }
}

// Kick off loading immediately on module import (server-side only)
if (typeof window === 'undefined') {
    ensureLoaded()
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Re-fetch and rebuild both caches.
 * Called by the weekly cron endpoint.
 */
export async function refreshDomains(): Promise<{
    universityCount: number
    disposableCount: number
    updatedAt: string
}> {
    const [uniResult, dispResult] = await Promise.allSettled([
        fetchUniversityMap(),
        fetchDisposableSet(),
    ])

    if (uniResult.status === 'fulfilled') {
        domainMap = uniResult.value
        isUniversityLoaded = true
    } else {
        console.warn('[university-domains] Refresh: university fetch failed:', uniResult.reason)
    }

    if (dispResult.status === 'fulfilled') {
        disposableSet = dispResult.value
        isDisposableLoaded = true
    } else {
        console.warn('[university-domains] Refresh: disposable fetch failed:', dispResult.reason)
    }

    lastUpdated = new Date()
    console.log(`[university-domains] Refreshed — uni: ${domainMap.size}, disposable: ${disposableSet.size}`)

    return {
        universityCount: domainMap.size,
        disposableCount: disposableSet.size,
        updatedAt: lastUpdated.toISOString(),
    }
}

/**
 * Wait for caches to be ready (handles cold start in API routes).
 */
export async function waitForCache(): Promise<void> {
    if (isUniversityLoaded && isDisposableLoaded) return
    await ensureLoaded()
}

/**
 * Extract domain from an email address.
 */
export function extractDomain(email: string): string | null {
    const parts = email.toLowerCase().trim().split('@')
    return parts.length === 2 && parts[1] ? parts[1] : null
}

/**
 * Returns true if the domain is in the disposable/generic blocklist.
 */
export function isDisposableDomain(domain: string): boolean {
    return disposableSet.has(domain.toLowerCase().trim())
}

/**
 * Look up a domain (or its parent subdomain) in the university cache.
 * Returns university info if found, null otherwise.
 */
export function getUniversityInfo(domain: string): UniversityInfo | null {
    const d = domain.toLowerCase().trim()

    // 1. Exact match
    if (domainMap.has(d)) return domainMap.get(d)!

    // 2. Subdomain walk-up: cs.ox.ac.uk → ox.ac.uk → ac.uk (stop at 2 labels)
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

export function getCacheStats() {
    return {
        universityCount: domainMap.size,
        disposableCount: disposableSet.size,
        lastUpdated,
        isUniversityLoaded,
        isDisposableLoaded,
    }
}
