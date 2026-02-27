'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function getAdminOverviewMetrics() {
    const session = await auth()
    if (!session || !session.user || session.user.role !== 'ADMIN') {
        return null
    }

    async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
        try { return await fn() }
        catch (e) {
            console.error(`[AdminMetrics] ${label} failed:`, (e as Error).message)
            return fallback
        }
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
        safe('totalUniversities', () => prisma.university.count(), 0),
        safe('totalStudents', () => prisma.student.count(), 0),
        safe('totalMeetings', () => prisma.meeting.count(), 0),
        safe('pendingVerifications', () => prisma.university.count({ where: { verificationStatus: 'PENDING' } }), 0),
        safe('pendingAdvisory', () => prisma.advisoryRequest.count({ where: { status: 'NEW' } }), 0),
        safe('hostRequestsPending', () => prisma.hostRequest.count({ where: { status: 'SUBMITTED' } }), 0),
        safe('meetingsByUni', () => prisma.meeting.groupBy({
            by: ['universityId'],
            _count: { _all: true },
            take: 10,
            orderBy: { _count: { universityId: 'desc' } }
        }), []),
    ])

    const topUnis = await Promise.all((meetingsByUni as any[]).map(async (item) => {
        const uni = await safe('topUniLookup', () => prisma.university.findUnique({
            where: { id: item.universityId },
            select: { institutionName: true }
        }), null)
        return { name: uni?.institutionName || 'Unknown', count: item._count._all }
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

