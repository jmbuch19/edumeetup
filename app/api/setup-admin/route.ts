import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { hasValidBearerSecret } from '@/lib/security/bearer'

/**
 * One-time admin bootstrap route.
 * Disabled unless ENABLE_ADMIN_BOOTSTRAP=true and ADMIN_SECRET is configured.
 */
export async function GET(request: NextRequest) {
    if (process.env.ENABLE_ADMIN_BOOTSTRAP !== 'true') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const adminSecret = process.env.ADMIN_SECRET
    if (!adminSecret) {
        return NextResponse.json({ error: 'Not configured' }, { status: 503 })
    }

    if (!hasValidBearerSecret(request.headers.get('Authorization'), adminSecret)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // Refuse to bootstrap if any admin already exists, even if ADMIN_EMAIL changed.
        const existingAdmin = await prisma.user.findFirst({
            where: { role: 'ADMIN' },
            select: { id: true },
        })
        if (existingAdmin) {
            return NextResponse.json({ error: 'Admin already configured' }, { status: 409 })
        }

        const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
        if (!adminEmail) {
            return NextResponse.json({ error: 'ADMIN_EMAIL not configured' }, { status: 503 })
        }

        await prisma.user.create({
            data: {
                email: adminEmail,
                role: 'ADMIN',
                isActive: true,
            },
        })

        console.warn('[setup-admin] Admin bootstrap completed; disable ENABLE_ADMIN_BOOTSTRAP now')
        return NextResponse.json({ success: true }, {
            headers: { 'Cache-Control': 'no-store' },
        })
    } catch {
        console.error('[setup-admin] Failed')
        return NextResponse.json({ error: 'Failed to create admin' }, { status: 500 })
    }
}
