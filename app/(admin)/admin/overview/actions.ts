'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export async function getAdminOverviewMetrics() {
    const session = await auth()
    if (!session || !session.user || (session.user as any).role !== 'ADMIN') {
        return null // Handling auth in page mostly, but safe here too
    }

    const [
        totalUniversities,
        totalStudents,
        totalMeetings,
        meetingsByUni
    ] = await Promise.all([
        prisma.universityProfile.count(),
        prisma.studentProfile.count(),
        prisma.meetingRequest.count(),
        prisma.meetingRequest.groupBy({
            by: ['universityId'],
            _count: {
                _all: true
            },
            take: 10,
            orderBy: {
                _count: {
                    universityId: 'desc'
                }
            }
        })
    ])

    // Enrich uni names
    const topUnis = await Promise.all(meetingsByUni.map(async (item) => {
        const uni = await prisma.universityProfile.findUnique({
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
        topUnis
    }
}
