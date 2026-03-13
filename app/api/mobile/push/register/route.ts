import { NextRequest, NextResponse } from 'next/server'
import { verifyMobileToken } from '@/lib/auth/mobile-verify'
import { prisma } from '@/lib/prisma'

// POST /api/mobile/push/register
// Stores or updates the Expo push token for the authenticated user
export async function POST(req: NextRequest) {
    const token = await verifyMobileToken(req)
    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { token: pushToken } = await req.json()
    if (!pushToken || typeof pushToken !== 'string') {
        return NextResponse.json({ error: 'token required' }, { status: 400 })
    }

    // Store push token on the user record (notificationPrefs JSON field)
    await prisma.user.update({
        where: { id: token.sub },
        data: {
            // Store in the existing notificationPrefs JSON on Student/University
            // We update the user's metadata — app will look it up when sending pushes
        },
    })

    // Depending on role, store in the right place
    if (token.role === 'STUDENT') {
        const student = await prisma.student.findUnique({ where: { userId: token.sub } })
        if (student) {
            const prefs = (student.notificationPrefs as Record<string, unknown>) ?? {}
            await prisma.student.update({
                where: { userId: token.sub },
                data: { notificationPrefs: { ...prefs, expoPushToken: pushToken } },
            })
        }
    } else if (['UNIVERSITY', 'UNIVERSITY_REP'].includes(token.role)) {
        const university = await prisma.university.findUnique({ where: { userId: token.sub } })
        if (university) {
            const prefs = (university.notificationPrefs as Record<string, unknown>) ?? {}
            await prisma.university.update({
                where: { userId: token.sub },
                data: { notificationPrefs: { ...prefs, expoPushToken: pushToken } },
            })
        }
    }

    return NextResponse.json({ success: true })
}
