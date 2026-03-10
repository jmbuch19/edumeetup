'use server'

import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

export type BotLead = {
    id: string
    createdAt: Date
    leadScore: number
    leadTier: string
    leadSignals: string[]
    question: string | null
    answer: string | null
    toolNames: string[]
    studentId: string | null
    userId: string | null
    streamEmpty: boolean
    timings: Record<string, number>
    // Joined from User table
    email: string | null
    name: string | null
}

export type LeadFilter = 'all' | 'hot' | 'warm' | 'cold'

export async function getBotLeads(filter: LeadFilter = 'all', limit = 50): Promise<BotLead[]> {
    await requireRole('ADMIN')

    const tierMap: Record<LeadFilter, string | undefined> = {
        all: undefined,
        hot: '🔥 Hot',
        warm: '🟡 Warm',
        cold: '🔵 Cold',
    }

    const logs = await prisma.systemLog.findMany({
        where: {
            type: 'BOT_TRACE',
            // Only score ≥ 1 to exclude empty/errored sessions
            ...(filter !== 'all' ? {
                metadata: { path: ['leadTier'], equals: tierMap[filter] }
            } : {}),
        },
        orderBy: [
            // Sort by leadScore desc (high intent first), then recency
            { createdAt: 'desc' },
        ],
        take: limit,
        select: {
            id: true,
            createdAt: true,
            metadata: true,
        },
    })

    // Extract typed fields from JSON metadata
    const raw = logs.map(log => {
        const m = (log.metadata ?? {}) as Record<string, any>
        return {
            id: log.id,
            createdAt: log.createdAt,
            leadScore: m.leadScore ?? 0,
            leadTier: m.leadTier ?? '🔵 Cold',
            leadSignals: Array.isArray(m.leadSignals) ? m.leadSignals : [],
            question: m.question ?? null,
            answer: m.answer ?? null,
            toolNames: Array.isArray(m.toolNames) ? m.toolNames : [],
            studentId: m.studentId ?? null,
            userId: m.userId ?? null,
            streamEmpty: m.streamEmpty ?? false,
            timings: m.timings ?? {},
            email: null,
            name: null,
        }
    })

    // Sort by leadScore descending after fetch (JSON field can't be ordered in Prisma easily)
    raw.sort((a, b) => b.leadScore - a.leadScore)

    // Batch-join user info for logged-in sessions
    const userIds = [...new Set(raw.filter(r => r.userId).map(r => r.userId as string))]
    if (userIds.length > 0) {
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true, name: true },
        })
        const userMap = new Map(users.map(u => [u.id, u]))
        raw.forEach(r => {
            if (r.userId) {
                const u = userMap.get(r.userId)
                if (u) { r.email = u.email; r.name = u.name }
            }
        })
    }

    return raw
}

export async function getBotLeadStats() {
    await requireRole('ADMIN')

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [total24h, hot24h, warm24h, total7d] = await Promise.all([
        prisma.systemLog.count({ where: { type: 'BOT_TRACE', createdAt: { gte: oneDayAgo } } }),
        prisma.systemLog.count({ where: { type: 'BOT_TRACE', createdAt: { gte: oneDayAgo }, metadata: { path: ['leadTier'], equals: '🔥 Hot' } } }),
        prisma.systemLog.count({ where: { type: 'BOT_TRACE', createdAt: { gte: oneDayAgo }, metadata: { path: ['leadTier'], equals: '🟡 Warm' } } }),
        prisma.systemLog.count({ where: { type: 'BOT_TRACE', createdAt: { gte: sevenDaysAgo } } }),
    ])

    return { total24h, hot24h, warm24h, total7d }
}
