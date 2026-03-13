import { NextRequest, NextResponse } from 'next/server'
import { verifyMobileToken } from '@/lib/auth/mobile-verify'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    const token = await verifyMobileToken(req)
    if (!token || token.role !== 'STUDENT') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const student = await prisma.student.findUnique({ where: { userId: token.sub } })
    if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const sessions = await prisma.groupSession.findMany({
        where: { scheduledAt: { gte: new Date() }, status: { in: ['OPEN', 'FILLING'] } },
        include: {
            university: { select: { institutionName: true } },
            seats: { where: { studentId: student.id, status: 'CONFIRMED' } },
            _count: { select: { seats: { where: { status: 'CONFIRMED' } } } },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 20,
    })

    return NextResponse.json(
        sessions.map((s) => ({
            id: s.id,
            title: s.title,
            description: s.agenda ?? null,
            scheduledAt: s.scheduledAt.toISOString(),
            duration: s.durationMinutes,
            universityName: s.university.institutionName,
            registered: s.seats.length > 0,
            maxParticipants: s.capacity,
            registrationCount: s._count.seats,
            joinUrl: s.joinUrl ?? null,
        }))
    )
}

export async function POST(req: NextRequest) {
    const token = await verifyMobileToken(req)
    if (!token || token.role !== 'STUDENT') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId, action } = await req.json()
    if (!sessionId || !action) {
        return NextResponse.json({ error: 'sessionId and action required' }, { status: 400 })
    }

    const student = await prisma.student.findUnique({ where: { userId: token.sub } })
    if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const session = await prisma.groupSession.findUnique({
        where: { id: sessionId },
        include: { _count: { select: { seats: { where: { status: 'CONFIRMED' } } } } },
    })
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    if (action === 'join') {
        if (session._count.seats >= session.capacity) {
            return NextResponse.json({ error: 'Session is full' }, { status: 409 })
        }
        await prisma.groupSessionSeat.upsert({
            where: { groupSessionId_studentId: { groupSessionId: sessionId, studentId: student.id } },
            create: { groupSessionId: sessionId, studentId: student.id, status: 'CONFIRMED' },
            update: { status: 'CONFIRMED' },
        })
        return NextResponse.json({ success: true, registered: true })
    }

    if (action === 'cancel') {
        await prisma.groupSessionSeat.updateMany({
            where: { groupSessionId: sessionId, studentId: student.id },
            data: { status: 'CANCELLED' },
        })
        return NextResponse.json({ success: true, registered: false })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
