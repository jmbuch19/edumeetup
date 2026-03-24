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

    // Get fairs student has a pass for (with event)
    const passes = await prisma.fairStudentPass.findMany({
        where: {
            studentId: student.id,
            fairEvent: { startDate: { gte: new Date() } },
        },
        include: {
            fairEvent: {
                select: { id: true, name: true, venue: true, city: true, startDate: true, status: true },
            },
        },
        orderBy: { fairEvent: { startDate: 'asc' } },
    })

    // Upcoming public fairs for discovery
    const upcomingFairs = await prisma.fairEvent.findMany({
        where: { status: { in: ['UPCOMING', 'LIVE'] }, startDate: { gte: new Date() } },
        select: { id: true, name: true, venue: true, city: true, startDate: true, status: true },
        orderBy: { startDate: 'asc' },
        take: 10,
    })

    const registeredIds = new Set(passes.map((p: any) => p.fairEventId))

    return NextResponse.json({
        myFairs: passes.map((p: any) => ({
            id: p.fairEvent.id,
            name: p.fairEvent.name,
            venue: p.fairEvent.venue ?? p.fairEvent.city ?? 'TBD',
            startDate: p.fairEvent.startDate.toISOString(),
            status: p.fairEvent.status,
            registered: true,
            passId: p.id,
        })),
        upcomingFairs: upcomingFairs.map((f: any) => ({
            id: f.id,
            name: f.name,
            venue: f.venue ?? f.city ?? 'TBD',
            startDate: f.startDate.toISOString(),
            status: f.status,
            registered: registeredIds.has(f.id),
        })),
    })
}
