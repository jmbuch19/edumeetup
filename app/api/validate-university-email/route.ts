import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
    extractDomain,
    getUniversityInfo,
    isDisposableDomain,
    waitForCache,
} from '@/lib/university-domains'

export const dynamic = 'force-dynamic'

// ─── Rate limiter ─────────────────────────────────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60_000

function checkRateLimit(ip: string): boolean {
    const now = Date.now()
    const entry = rateLimitMap.get(ip)
    if (!entry || now > entry.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW_MS })
        return true
    }
    if (entry.count >= RATE_LIMIT) return false
    entry.count++
    return true
}

// Prune stale rate-limit entries every 5 minutes
setInterval(() => {
    const now = Date.now()
    for (const [ip, entry] of rateLimitMap.entries()) {
        if (now > entry.resetTime) rateLimitMap.delete(ip)
    }
}, 5 * 60_000)

// ─── Schema ───────────────────────────────────────────────────────────────────

const Schema = z.object({
    email: z.string().email('Please enter a valid email address.'),
})

// ─── Messages ─────────────────────────────────────────────────────────────────

const MSG_GENERIC_BLOCKED = [
    'Personal, generic, or disposable email providers are not allowed for university registration.',
    'Please use your official institutional email address (e.g. admissions@youruni.edu, staff@uni.ac.uk).',
    `If you believe this is an error, contact ${process.env.SUPPORT_EMAIL ?? 'support@edumeetup.com'}.`,
].join(' ')

const MSG_NOT_RECOGNIZED = [
    'This email domain is not recognized as an official university in our target regions',
    '(USA, UK, Canada, Australia, NZ, Germany, UAE, India, Singapore, or EU member states).',
    '\n\nValid examples: j@harvard.edu · admissions@ox.ac.uk · registrar@nus.edu.sg · info@iitb.ac.in · student@cs.tum.de',
    `\n\nIf your institution should be listed, contact ${process.env.SUPPORT_EMAIL ?? 'support@edumeetup.com'} with your official domain.`,
].join(' ')

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
    // Rate limiting
    const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

    if (!checkRateLimit(ip)) {
        return NextResponse.json(
            { valid: false, message: 'Too many validation requests. Please try again in a minute.' },
            { status: 429 }
        )
    }

    // Parse body
    let body: unknown
    try {
        body = await request.json()
    } catch {
        return NextResponse.json(
            { valid: false, message: 'Invalid request body.' },
            { status: 400 }
        )
    }

    // Validate schema
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json(
            { valid: false, message: parsed.error.issues[0]?.message ?? 'Invalid email.' },
            { status: 400 }
        )
    }

    const { email } = parsed.data
    const domain = extractDomain(email)

    if (!domain) {
        return NextResponse.json({ valid: false, message: 'Could not extract domain from email.' })
    }

    // Ensure caches are warm (handles cold start)
    await waitForCache()

    // 1. Block disposable / generic / personal providers
    if (isDisposableDomain(domain)) {
        return NextResponse.json({ valid: false, message: MSG_GENERIC_BLOCKED })
    }

    // 2. Look up in university domain map
    const info = getUniversityInfo(domain)

    if (info) {
        return NextResponse.json({
            valid: true,
            universityName: info.name,
            country: info.country,
        })
    }

    // 3. No match
    return NextResponse.json({ valid: false, message: MSG_NOT_RECOGNIZED })
}
