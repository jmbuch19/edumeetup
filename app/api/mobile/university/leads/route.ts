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

    // Students who expressed interest via the Interest model
    const interests = await prisma.interest.findMany({
        where: { universityId: university.id },
        include: {
            student: {
                include: {
                    user: { select: { id: true, name: true, email: true, image: true } },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
    })

    return NextResponse.json(
        interests.map((i) => ({
            id: i.student.userId,
            name: i.student.user.name,
            email: i.student.user.email,
            image: i.student.user.image,
            country: i.student.country,
            program: i.student.currentStatus ?? null,
            interestedAt: i.createdAt.toISOString(),
        }))
    )
}
