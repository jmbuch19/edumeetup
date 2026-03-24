import { NextRequest, NextResponse } from 'next/server'
import { verifyMobileToken } from '@/lib/auth/mobile-verify'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    const token = await verifyMobileToken(req)
    if (!token || !['UNIVERSITY', 'UNIVERSITY_REP'].includes(token.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const university = await prisma.university.findUnique({
        where: { userId: token.sub },
        select: { id: true },
    })
    if (!university) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const sessions = await prisma.groupSession.findMany({
        where: { universityId: university.id, scheduledAt: { gte: new Date() } },
        include: {
            _count: { select: { seats: { where: { status: 'CONFIRMED' } } } },
        },
        orderBy: { scheduledAt: 'asc' },
    })

    return NextResponse.json(
        sessions.map((s: any) => ({
            id: s.id,
            title: s.title,
            description: s.agenda ?? null,
            scheduledAt: s.scheduledAt.toISOString(),
            duration: s.durationMinutes,
            universityName: '',
            registered: false,
            maxParticipants: s.capacity,
            registrationCount: s._count.seats,
            joinUrl: s.joinUrl ?? null,
        }))
    )
}
