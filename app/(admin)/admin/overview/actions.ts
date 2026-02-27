'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function getAdminOverviewMetrics() {
    const session = await auth()
    if (!session || !session.user || session.user.role !== 'ADMIN') {
        return null
    }

    const [
        totalUniversities,
        totalStudents,
        totalMeetings,
        pendingVerifications,
        pendingAdvisory,
        hostRequestsPending,
        meetingsByUni
    ] = await Promise.all([
        prisma.university.count(),
        prisma.student.count(),
        prisma.meeting.count(),
        prisma.university.count({ where: { verificationStatus: 'PENDING' } }),
        prisma.advisoryRequest.count({ where: { status: 'NEW' } }),
        prisma.hostRequest.count({ where: { status: 'SUBMITTED' } }),
        prisma.meeting.groupBy({
            by: ['universityId'],
            _count: { _all: true },
            take: 10,
            orderBy: { _count: { universityId: 'desc' } }
        })
    ])

    // Enrich uni names
    const topUnis = await Promise.all(meetingsByUni.map(async (item) => {
        const uni = await prisma.university.findUnique({
            where: { id: item.universityId },
            select: { institutionName: true }
        })
        return {
            name: uni?.institutionName || 'Unknown',
            count: item._count._all
        }
    }))

    return {
        totalUniversities,
        totalStudents,
        totalMeetings,
        pendingVerifications,
        pendingAdvisory,
        hostRequestsPending,
        topUnis
    }
}
