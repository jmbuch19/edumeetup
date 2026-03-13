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

    const [leadsResult, sessionsResult, proactiveSent] = await Promise.allSettled([
        // Leads = students who expressed interest (Interest model)
        prisma.interest.count({ where: { universityId: university.id } }),
        // Upcoming sessions
        prisma.groupSession.count({
            where: {
                universityId: university.id,
                scheduledAt: { gte: new Date() },
            },
        }),
        // Unread messages (proactive messages that were replied to)
        prisma.proactiveMessage.count({
            where: { universityId: university.id, status: 'REPLIED' },
        }),
    ])

    return NextResponse.json({
        totalLeads: leadsResult.status === 'fulfilled' ? leadsResult.value : 0,
        pendingMessages: proactiveSent.status === 'fulfilled' ? proactiveSent.value : 0,
        upcomingSessions: sessionsResult.status === 'fulfilled' ? sessionsResult.value : 0,
        profileViews: 0,
    })
}
