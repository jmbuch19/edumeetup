'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { withCache, invalidateCache } from '@/lib/cache'

export async function getAdminOverviewMetrics() {
    const session = await auth()
    if (!session || !session.user || session.user.role !== 'ADMIN') {
        return null
    }

    // Cache admin metrics for 5 minutes — these count queries are perfect cache candidates:
    // they're expensive under load, slightly stale is fine, and admin refreshes manually when needed.
    return withCache('admin:overview-metrics', 300, async () => {
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

        // Fix N+1: single findMany replaces one findUnique per university
        const topUniIds = (meetingsByUni as any[]).map(m => m.universityId)
        const topUniRecords = topUniIds.length > 0
            ? await safe('topUnisBatch', () => prisma.university.findMany({
                where: { id: { in: topUniIds } },
                select: { id: true, institutionName: true }
            }), [])
            : []

        const uniNameMap = Object.fromEntries(
            (topUniRecords as any[]).map(u => [u.id, u.institutionName])
        )
        const topUnis = (meetingsByUni as any[]).map(item => ({
            name: uniNameMap[item.universityId] || 'Unknown',
            count: item._count._all
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
    })
}

/** Call after any admin action that changes counts (verify uni, etc.) */
export async function invalidateAdminMetricsCache() {
    await invalidateCache('admin:overview-metrics')
}
