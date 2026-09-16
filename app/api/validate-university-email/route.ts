import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import {
    extractDomain,
    getUniversityInfo,
    isDisposableDomain,
    waitForCache,
} from '@/lib/university-domains'

export const dynamic = 'force-dynamic'

const localRateLimit = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60_000

function checkLocalRateLimit(ip: string): boolean {
    const now = Date.now()
    const entry = localRateLimit.get(ip)
    if (!entry || now > entry.resetTime) {
        if (localRateLimit.size > 2_000) localRateLimit.clear()
        localRateLimit.set(ip, { count: 1, resetTime: now + RATE_WINDOW_MS })
        return true
    }
    if (entry.count >= RATE_LIMIT) return false
    entry.count += 1
    return true
}

async function checkRateLimit(ip: string): Promise<boolean> {
    try {
        const limiter = new Ratelimit({
            redis: Redis.fromEnv(),
            limiter: Ratelimit.slidingWindow(RATE_LIMIT, '1 m'),
            prefix: 'api:university-email',
            ephemeralCache: new Map(),
        })
        return (await limiter.limit(ip)).success
    } catch {
        // Local fallback still limits bursts when Redis is unavailable; serverless instances
        // cannot provide a globally consistent fallback, so production should configure Upstash.
        return checkLocalRateLimit(ip)
    }
}

const Schema = z.object({
    email: z.string().trim().max(254).email('Please enter a valid email address.').transform(value => value.toLowerCase()),
})

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

export async function POST(request: Request) {
    const ip = request.headers.get('x-nf-client-connection-ip')?.trim()
        || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || 'unknown'

    if (!(await checkRateLimit(ip))) {
        return NextResponse.json(
            { valid: false, message: 'Too many validation requests. Please try again in a minute.' },
            { status: 429, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } }
        )
    }

    let body: unknown
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

    const domain = extractDomain(parsed.data.email)
    if (!domain) {
        return NextResponse.json({ valid: false, message: 'Could not extract domain from email.' }, { status: 400 })
    }

    await waitForCache()

    if (isDisposableDomain(domain)) {
        return NextResponse.json({ valid: false, message: MSG_GENERIC_BLOCKED }, {
            headers: { 'Cache-Control': 'no-store' },
        })
    }

    const info = getUniversityInfo(domain)
    if (info) {
        return NextResponse.json({
            valid: true,
            universityName: info.name,
            country: info.country,
        }, {
            headers: { 'Cache-Control': 'no-store' },
        })
    }

    return NextResponse.json({ valid: false, message: MSG_NOT_RECOGNIZED }, {
        headers: { 'Cache-Control': 'no-store' },
    })
}
