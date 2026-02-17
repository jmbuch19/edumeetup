'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { startOfWeek, endOfWeek, startOfDay, endOfDay, subDays } from 'date-fns'

export async function getUniversityMetrics() {
    const session = await auth()
    if (!session || !session.user || (session.user as any).role !== 'UNIVERSITY') {
        return null
    }

    // Assume we use 'repId' if the user is a rep, or handle for whole uni if main account?
    // For MVP transparency, main account (or any rep?) sees their own impact or whole uni?
    // Prompt says: "On /university/dashboard show...". Assuming Main Uni Account view.
    // We'll filter by universityId linkage if possible, but our current MeetingRequest stores 'repId'.
    // We should find all reps for this university OR if this user is a rep, show theirs.

    const userId = session.user.id
    let universityId = null

    // Check linkage
    const profile = await prisma.university.findUnique({ where: { userId } })
    if (profile) universityId = profile.id
    // If rep?
    if (!universityId) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { universityId: true } })
        if (user) universityId = user.universityId
    }

    if (!universityId) return null

    const now = new Date()
    const weekStart = startOfWeek(now)
    const weekEnd = endOfWeek(now)
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)
    const thirtyDaysAgo = subDays(now, 30)

    // Parallel fetch for dashboard speed
    const [
        meetingsThisWeek,
        pendingRequests,
        upcomingToday,
        past30DaysMeetings
    ] = await Promise.all([
        prisma.meetingRequest.count({
            where: {
                universityId,
                proposedDatetime: { gte: weekStart, lte: weekEnd },
                status: 'CONFIRMED'
            }
        }),
        prisma.meetingRequest.count({
            where: {
                universityId,
                status: 'PENDING'
            }
        }),
        prisma.meetingRequest.count({
            where: {
                universityId,
                status: 'CONFIRMED',
                proposedDatetime: { gte: todayStart, lte: todayEnd }
            }
        }),
        prisma.meetingRequest.findMany({
            where: {
                universityId,
                proposedDatetime: { gte: thirtyDaysAgo },
                status: { in: ['COMPLETED', 'CANCELLED', 'NO_SHOW'] } // Added NO_SHOW concept if we use it, otherwise strictly cancelled
            },
            select: { status: true }
        })
    ])

    // Calculate Rates
    const totalPast30 = past30DaysMeetings.length
    const cancelled = past30DaysMeetings.filter(m => m.status === 'CANCELLED').length
    const noShows = past30DaysMeetings.filter(m => m.status === 'NO_SHOW').length // If we support this status

    const cancellationRate = totalPast30 > 0 ? (cancelled / totalPast30) * 100 : 0
    const noShowRate = totalPast30 > 0 ? (noShows / totalPast30) * 100 : 0

    return {
        meetingsThisWeek,
        pendingRequests,
        upcomingToday,
        cancellationRate: cancellationRate.toFixed(1),
        noShowRate: noShowRate.toFixed(1)
    }
}
