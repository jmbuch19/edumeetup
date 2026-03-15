'use server'

import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

export type BotMiss = {
    id: string
    question: string
    createdAt: Date
}

/**
 * Returns the most recent unanswered bot questions.
 * Grouped by similarity is not done in DB — raw list, newest first.
 */
export async function getBotMisses(limit = 100): Promise<BotMiss[]> {
    await requireRole('ADMIN')
    return prisma.botMisses.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, question: true, createdAt: true },
    })
}

export async function getBotMissStats() {
    await requireRole('ADMIN')
    const [total, last24h, last7d] = await Promise.all([
        prisma.botMisses.count(),
        prisma.botMisses.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1_000) } } }),
        prisma.botMisses.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1_000) } } }),
    ])
    return { total, last24h, last7d }
}

/** Delete a single miss after reviewing it */
export async function dismissBotMiss(id: string) {
    await requireRole('ADMIN')
    await prisma.botMisses.delete({ where: { id } })
    return { success: true }
}

/** Bulk-clear all misses (use after a round of bot training) */
export async function clearAllBotMisses() {
    await requireRole('ADMIN')
    const { count } = await prisma.botMisses.deleteMany({})
    return { success: true, count }
}
