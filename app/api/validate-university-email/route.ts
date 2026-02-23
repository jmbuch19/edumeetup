import { NextResponse } from 'next/server'
import { z } from 'zod'
import { extractDomain, getUniversityInfo, waitForCache } from '@/lib/university-domains'

export const dynamic = 'force-dynamic'

// --- Generic / Disposable domain blocklist ---
const BLOCKED_DOMAINS = new Set([
    'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.in', 'yahoo.co.uk',
    'hotmail.com', 'hotmail.co.uk', 'outlook.com', 'outlook.in', 'live.com',
    'icloud.com', 'me.com', 'mac.com', 'proton.me', 'protonmail.com',
    'yandex.com', 'yandex.ru', 'mail.ru', 'qq.com', '163.com', '126.com',
    'sina.com', 'rediffmail.com', 'zoho.com', 'aol.com', 'gmx.com',
    'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
    'sharklasers.com', 'trashmail.com', 'dispostable.com',
])

// --- Simple IP rate limiter ---
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60_000

function checkRateLimit(ip: string): boolean {
    const now = Date.now()
    const entry = rateLimitMap.get(ip)

    if (!entry || now > entry.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW_MS })
        return true // allowed
    }

    if (entry.count >= RATE_LIMIT) return false // blocked

    entry.count++
    return true
}

// Cleanup stale entries every 5 minutes to prevent memory growth
setInterval(() => {
    const now = Date.now()
    for (const [ip, entry] of rateLimitMap.entries()) {
        if (now > entry.resetTime) rateLimitMap.delete(ip)
    }
}, 5 * 60_000)

const Schema = z.object({
    email: z.string().email('Invalid email format'),
})

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

    // Parse and validate input
    let body: { email: string }
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ valid: false, message: 'Invalid request body.' }, { status: 400 })
    }

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

    // 1. Block generic/disposable providers
    if (BLOCKED_DOMAINS.has(domain)) {
        return NextResponse.json({
            valid: false,
            message:
                'Personal or generic email providers are not allowed for university registration. Please use your official institutional email.',
        })
    }

    // 2. Ensure university domain cache is ready (handles cold start)
    await waitForCache()

    // 3. Look up in university domain map
    const info = getUniversityInfo(domain)

    if (info) {
        return NextResponse.json({
            valid: true,
            universityName: info.name,
            country: info.country,
        })
    }

    // 4. No match found
    return NextResponse.json({
        valid: false,
        message:
            'Email domain not recognized as an official university in our target countries (USA, UK, Canada, Australia, NZ, Germany, UAE, India, Singapore, or EU). Please use your institutional email (e.g. @harvard.edu, @ox.ac.uk, @iitb.ac.in).',
    })
}
