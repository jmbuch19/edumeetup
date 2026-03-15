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

/**
 * Returns the most recent BOT_HEALTH_CHECK log entry.
 * Written by netlify/functions/bot-health-check.mts every hour at :15.
 * Metadata shape: { totalCount, emptyCount, emptyRate, redisCount, groqCount, truncCount, truncRate }
 */
export async function getLatestBotHealth() {
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') return null

    try {
        const log = await prisma.systemLog.findFirst({
            where: { type: 'BOT_HEALTH_CHECK' },
            orderBy: { createdAt: 'desc' },
        })
        if (!log) return null

        const m = log.metadata as Record<string, number | boolean>
        const emptyRate  = (m.emptyRate  as number) ?? 0
        const redisCount = (m.redisCount as number) ?? 0
        const groqCount  = (m.groqCount  as number) ?? 0
        const truncRate  = (m.truncRate  as number) ?? 0

        return {
            checkedAt:    log.createdAt,
            totalTurns:   (m.totalCount  as number) ?? 0,
            emptyRate,                        // 0–1 fraction
            redisFailures: redisCount,
            groq429s:      groqCount,
            truncRate,                        // 0–1 fraction
            // Mirror the same thresholds used in bot-health-check.mts
            hasAlerts: emptyRate > 0.20 || redisCount >= 1 || groqCount > 0 || truncRate > 0.15,
        }
    } catch {
        return null
    }
}
