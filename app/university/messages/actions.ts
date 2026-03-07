'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

const DAILY_LIMIT = 10
const ANNUAL_LIMIT = 300
const CHAR_LIMIT = 300

async function getUniversityOrThrow() {
    const session = await auth()
    if (!session?.user) throw new Error('Not authenticated')

    const university = await prisma.university.findFirst({
        where: {
            OR: [
                { userId: session.user.id },
                { reps: { some: { id: session.user.id } } },
            ],
        },
    })
    if (!university) throw new Error('University record not found')
    return { session, university }
}

/** Returns quota info for the university (shared across all reps) */
export async function getUniversityQuota(universityId: string) {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    // Find all user IDs belonging to this university (owner + reps)
    const uni = await prisma.university.findUnique({
        where: { id: universityId },
        select: {
            userId: true,
            reps: { select: { id: true } },
        },
    })
    if (!uni) return { daily: 0, annual: 0, dailyLimit: DAILY_LIMIT, annualLimit: ANNUAL_LIMIT }

    const repIds = [uni.userId, ...uni.reps.map((r) => r.id)]

    const [daily, annual] = await Promise.all([
        prisma.directMessage.count({
            where: { senderId: { in: repIds }, senderRole: 'UNIVERSITY', createdAt: { gte: startOfDay } },
        }),
        prisma.directMessage.count({
            where: { senderId: { in: repIds }, senderRole: 'UNIVERSITY', createdAt: { gte: startOfYear } },
        }),
    ])

    return { daily, annual, dailyLimit: DAILY_LIMIT, annualLimit: ANNUAL_LIMIT }
}

/** University sends a direct message */
export async function sendUniversityDirectMessage(conversationId: string, content: string) {
    const { session, university } = await getUniversityOrThrow()

    if (!content?.trim()) return { error: 'Message cannot be empty.' }
    if (content.length > CHAR_LIMIT) return { error: `Max ${CHAR_LIMIT} characters.` }

    // Verify the conversation belongs to this university
    const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
    })
    if (!conversation || conversation.universityId !== university.id) {
        return { error: 'Conversation not found.' }
    }

    // Quota check
    const quota = await getUniversityQuota(university.id)
    if (quota.daily >= DAILY_LIMIT) return { error: `Daily limit of ${DAILY_LIMIT} messages reached.` }
    if (quota.annual >= ANNUAL_LIMIT) return { error: `Annual limit of ${ANNUAL_LIMIT} messages reached.` }

    await prisma.directMessage.create({
        data: {
            conversationId,
            senderId: session.user.id,
            senderRole: 'UNIVERSITY',
            content: content.trim(),
        },
    })

    await prisma.conversation.update({ where: { id: conversationId }, data: {} })

    revalidatePath(`/university/messages/${conversationId}`)
    return { success: true }
}

/** Mark all messages in a conversation as read by the university */
export async function markConversationReadByUniversity(conversationId: string) {
    const { university } = await getUniversityOrThrow()

    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } })
    if (!conversation || conversation.universityId !== university.id) return

    await prisma.directMessage.updateMany({
        where: {
            conversationId,
            senderRole: 'STUDENT',
            readAt: null,
        },
        data: { readAt: new Date() },
    })

    revalidatePath('/university/messages')
    revalidatePath(`/university/messages/${conversationId}`)
}

/** Load all conversations for this university */
export async function getUniversityConversations() {
    const { university } = await getUniversityOrThrow()

    const conversations = await prisma.conversation.findMany({
        where: { universityId: university.id },
        include: {
            student: {
                select: {
                    id: true,
                    fullName: true,
                    user: { select: { name: true, image: true } },
                },
            },
            messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
            },
        },
        orderBy: { updatedAt: 'desc' },
    })

    const withUnread = await Promise.all(
        conversations.map(async (c) => {
            const unreadCount = await prisma.directMessage.count({
                where: { conversationId: c.id, senderRole: 'STUDENT', readAt: null },
            })
            return { ...c, unreadCount }
        })
    )

    return withUnread
}

/** Load a single conversation thread */
export async function getUniversityConversationThread(conversationId: string) {
    const { university } = await getUniversityOrThrow()

    const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, universityId: university.id },
        include: {
            student: {
                select: {
                    id: true,
                    fullName: true,
                    fieldOfInterest: true,
                    preferredCountries: true,
                    user: { select: { name: true, image: true, email: true } },
                },
            },
            messages: { orderBy: { createdAt: 'asc' } },
        },
    })

    return conversation
}
