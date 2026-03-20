import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, createHash } from 'crypto'
import { prisma } from '@/lib/prisma'

/**
 * Emergency admin magic-link generator.
 * Returns the login URL directly — bypasses email delivery entirely.
 *
 * Usage:
 *   curl -H "Authorization: Bearer <ADMIN_SECRET>" \
 *        https://edumeetup.com/api/admin-login-link
 *
 * Or open in browser DevTools console:
 *   fetch('/api/admin-login-link', { headers: { Authorization: 'Bearer <ADMIN_SECRET>' } })
 *     .then(r => r.json()).then(d => console.log(d.url))
 *
 * ⚠️  Delete this file once email delivery is restored.
 */
export async function GET(request: NextRequest) {
    const adminSecret = process.env.ADMIN_SECRET
    if (!adminSecret) {
        return NextResponse.json({ error: 'ADMIN_SECRET not configured' }, { status: 503 })
    }

    const authHeader = request.headers.get('Authorization')
    const provided = authHeader?.replace('Bearer ', '').trim()
    if (provided !== adminSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@edumeetup.com'
    const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? ''
    const baseUrl = (process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? 'https://edumeetup.com').replace(/\/$/, '')

    // Verify admin exists (relaxed — no isActive check, we'll auto-fix below)
    const admin = await prisma.user.findFirst({
        where: { email: { equals: adminEmail, mode: 'insensitive' }, role: 'ADMIN' }
    })
    if (!admin) {
        return NextResponse.json({ error: `No ADMIN user found for ${adminEmail}` }, { status: 404 })
    }

    // Auto-reactivate if the account was somehow deactivated
    if (!admin.isActive) {
        await prisma.user.update({ where: { id: admin.id }, data: { isActive: true } })
        console.log(`[ADMIN-LOGIN-LINK] Auto-reactivated admin account ${adminEmail}`)
    }


    // Generate token (same algorithm as sendMagicLink)
    const plainToken = randomBytes(32).toString('hex')
    const hashedToken = createHash('sha256').update(`${plainToken}${secret}`).digest('hex')

    await prisma.verificationToken.deleteMany({ where: { identifier: adminEmail } })
    await prisma.verificationToken.create({
        data: {
            identifier: adminEmail,
            token: hashedToken,
            expires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        }
    })

    const params = new URLSearchParams({
        callbackUrl: '/admin/dashboard',
        token: plainToken,
        email: adminEmail,
    })
    const loginUrl = `${baseUrl}/auth/confirm?url=${encodeURIComponent(`${baseUrl}/api/auth/callback/email?${params.toString()}`)}`

    console.log(`[ADMIN-LOGIN-LINK] Generated for ${adminEmail}`)

    return NextResponse.json({
        url: loginUrl,
        note: 'Open this URL in your browser within 15 minutes. Single-use.',
        expires: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    })
}
