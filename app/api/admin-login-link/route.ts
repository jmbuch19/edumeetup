import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import { hasValidBearerSecret } from '@/lib/security/bearer'

/**
 * Emergency admin magic-link generator.
 * Disabled unless ENABLE_ADMIN_LOGIN_LINK=true and ADMIN_SECRET is configured.
 */
export async function GET(request: NextRequest) {
    if (process.env.ENABLE_ADMIN_LOGIN_LINK !== 'true') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const adminSecret = process.env.ADMIN_SECRET
    if (!adminSecret) {
        return NextResponse.json({ error: 'Not configured' }, { status: 503 })
    }

    if (!hasValidBearerSecret(request.headers.get('Authorization'), adminSecret)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
    if (!authSecret) {
        console.error('[ADMIN-LOGIN-LINK] Auth secret is not configured')
        return NextResponse.json({ error: 'Not configured' }, { status: 503 })
    }

    const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@edumeetup.com'
    const baseUrl = (
        process.env.AUTH_URL
        ?? process.env.NEXT_PUBLIC_APP_URL
        ?? 'https://edumeetup.com'
    ).replace(/\/$/, '')

    const admin = await prisma.user.findFirst({
        where: {
            email: { equals: adminEmail, mode: 'insensitive' },
            role: 'ADMIN',
            isActive: true,
        },
        select: { id: true },
    })

    if (!admin) {
        return NextResponse.json({ error: 'Admin account unavailable' }, { status: 404 })
    }

    const plainToken = randomBytes(32).toString('hex')
    const hashedToken = createHash('sha256').update(`${plainToken}${authSecret}`).digest('hex')

    await prisma.$transaction([
        prisma.verificationToken.deleteMany({ where: { identifier: adminEmail } }),
        prisma.verificationToken.create({
            data: {
                identifier: adminEmail,
                token: hashedToken,
                expires: new Date(Date.now() + 15 * 60 * 1000),
            },
        }),
    ])

    const params = new URLSearchParams({
        callbackUrl: '/admin/dashboard',
        token: plainToken,
        email: adminEmail,
    })
    const callbackUrl = `${baseUrl}/api/auth/callback/email?${params.toString()}`
    const loginUrl = `${baseUrl}/auth/confirm?url=${encodeURIComponent(callbackUrl)}`

    console.warn('[ADMIN-LOGIN-LINK] Emergency login link generated')

    return NextResponse.json({
        url: loginUrl,
        expires: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    }, {
        headers: { 'Cache-Control': 'no-store' },
    })
}
