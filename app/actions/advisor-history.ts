'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export interface StoredMessage {
    role: 'user' | 'assistant'
    content: string
}

export interface AdvisorHistory {
    messages: StoredMessage[]
    savedAt: string // ISO date string
}

// Save the last N messages to the student's profile
export async function saveAdvisorHistory(messages: StoredMessage[]): Promise<void> {
    const session = await auth()
    if (!session?.user?.id || (session.user as any).role !== 'STUDENT') return

    const student = await prisma.student.findFirst({
        where: { userId: session.user.id },
        select: { id: true }
    })
    if (!student) return

    // Keep only the most recent 20 messages (10 exchanges) to avoid bloat
    const trimmed = messages.slice(-20)

    const history: AdvisorHistory = {
        messages: trimmed,
        savedAt: new Date().toISOString(),
    }

    await (prisma.student.update as any)({
        where: { id: student.id },
        data: { advisorChatHistory: history }
    })
}

// Load the saved history for the current student
export async function loadAdvisorHistory(): Promise<AdvisorHistory | null> {
    const session = await auth()
    if (!session?.user?.id || (session.user as any).role !== 'STUDENT') return null

    const student = await (prisma.student.findFirst as any)({
        where: { userId: session.user.id },
        select: { advisorChatHistory: true }
    })

    if (!student?.advisorChatHistory) return null

    try {
        return student.advisorChatHistory as unknown as AdvisorHistory
    } catch {
        return null
    }
}
