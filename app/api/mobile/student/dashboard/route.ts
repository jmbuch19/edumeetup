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

    const now = new Date()

    const [seatsResult, passesResult, unreadResult] = await Promise.allSettled([
        prisma.groupSessionSeat.findMany({
            where: {
                studentId: student.id,
                status: 'CONFIRMED',
                groupSession: { scheduledAt: { gte: now } },
            },
            include: {
                groupSession: {
                    include: {
                        university: { select: { institutionName: true } },
                        _count: { select: { seats: { where: { status: 'CONFIRMED' } } } },
                    },
                },
            },
            orderBy: { groupSession: { scheduledAt: 'asc' } },
            take: 5,
        }),
        prisma.fairStudentPass.findMany({
            where: {
                studentId: student.id,
                fairEvent: { startDate: { gte: now } },
            },
            include: {
                fairEvent: {
                    select: { id: true, name: true, venue: true, city: true, startDate: true },
                },
            },
            orderBy: { fairEvent: { startDate: 'asc' } },
            take: 3,
        }),
        prisma.proactiveMessage.count({
            where: { studentId: student.id, openedAt: null },
        }),
    ])

    const upcomingSessions =
        seatsResult.status === 'fulfilled'
            ? seatsResult.value.map((seat: typeof seatsResult.value[0]) => ({
                id: seat.groupSession.id,
                title: seat.groupSession.title,
                description: seat.groupSession.agenda ?? null,
                scheduledAt: seat.groupSession.scheduledAt.toISOString(),
                duration: seat.groupSession.durationMinutes,
                universityName: seat.groupSession.university.institutionName,
                registered: true,
                maxParticipants: seat.groupSession.capacity,
                registrationCount: seat.groupSession._count.seats,
                joinUrl: seat.groupSession.joinUrl ?? null,
            }))
            : []

    const upcomingFairs =
        passesResult.status === 'fulfilled'
            ? passesResult.value.map((p: typeof passesResult.value[0]) => ({
                id: p.fairEvent.id,
                name: p.fairEvent.name,
                venue: p.fairEvent.venue ?? p.fairEvent.city ?? 'TBD',
                startDate: p.fairEvent.startDate.toISOString(),
                registered: true,
            }))
            : []

    const unreadMessages = unreadResult.status === 'fulfilled' ? unreadResult.value : 0

    return NextResponse.json({
        upcomingSessions,
        upcomingFairs,
        unreadMessages,
        advisorDailyCount: 0,
        advisorDailyLimit: 20,
    })
}
