'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

const DAILY_LIMIT = 10
const ANNUAL_LIMIT = 200
const CHAR_LIMIT = 300

async function getStudentOrThrow() {
    const session = await auth()
    if (!session?.user) throw new Error('Not authenticated')
    const student = await prisma.student.findUnique({ where: { userId: session.user.id } })
    if (!student) throw new Error('Student record not found')
    return { session, student }
}

/** Finds or creates a Conversation — only if an Interest record exists */
export async function getOrCreateConversation(universityId: string) {
    const { student } = await getStudentOrThrow()

    const interest = await prisma.interest.findFirst({
        where: { studentId: student.id, universityId },
    })
    if (!interest) throw new Error('You can only message universities you have expressed interest in.')

    const conversation = await prisma.conversation.upsert({
        where: { studentId_universityId: { studentId: student.id, universityId } },
        create: { studentId: student.id, universityId },
        update: {},
        include: { university: { select: { institutionName: true, logo: true } } },
    })
    return conversation
}

/** Returns quota info for the student */
export async function getStudentQuota() {
    const { session } = await getStudentOrThrow()

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    const [daily, annual] = await Promise.all([
        prisma.directMessage.count({
            where: { senderId: session.user.id, senderRole: 'STUDENT', createdAt: { gte: startOfDay } },
        }),
        prisma.directMessage.count({
            where: { senderId: session.user.id, senderRole: 'STUDENT', createdAt: { gte: startOfYear } },
        }),
    ])
    return { daily, annual, dailyLimit: DAILY_LIMIT, annualLimit: ANNUAL_LIMIT }
}

/** Student sends a direct message */
export async function sendDirectMessage(conversationId: string, content: string) {
    const { session } = await getStudentOrThrow()

    if (!content?.trim()) return { error: 'Message cannot be empty.' }
    if (content.length > CHAR_LIMIT) return { error: `Max ${CHAR_LIMIT} characters.` }

    // Verify the conversation belongs to this student
    const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { student: { select: { userId: true } } },
    })
    if (!conversation || conversation.student.userId !== session.user.id) {
        return { error: 'Conversation not found.' }
    }

    // Quota check
    const quota = await getStudentQuota()
    if (quota.daily >= DAILY_LIMIT) return { error: `Daily limit of ${DAILY_LIMIT} messages reached.` }
    if (quota.annual >= ANNUAL_LIMIT) return { error: `Annual limit of ${ANNUAL_LIMIT} messages reached.` }

    await prisma.directMessage.create({
        data: {
            conversationId,
            senderId: session.user.id,
            senderRole: 'STUDENT',
            content: content.trim(),
        },
    })

    // bump updatedAt on conversation
    await prisma.conversation.update({ where: { id: conversationId }, data: {} })

    revalidatePath(`/student/messages/${conversationId}`)
    return { success: true }
}

/** Mark all messages in a conversation as read by the student */
export async function markConversationRead(conversationId: string) {
    const { session } = await getStudentOrThrow()

    // Only mark messages sent by the university as read
    await prisma.directMessage.updateMany({
        where: {
            conversationId,
            senderRole: 'UNIVERSITY',
            readAt: null,
        },
        data: { readAt: new Date() },
    })

    revalidatePath('/student/messages')
    revalidatePath(`/student/messages/${conversationId}`)
}

/** Load a conversation thread */
export async function getConversationThread(conversationId: string) {
    const { student } = await getStudentOrThrow()

    const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, studentId: student.id },
        include: {
            university: { select: { id: true, institutionName: true, logo: true, country: true } },
            messages: { orderBy: { createdAt: 'asc' } },
        },
    })
    return conversation
}

/** Load all conversations for this student */
export async function getStudentConversations() {
    const { student } = await getStudentOrThrow()

    const conversations = await prisma.conversation.findMany({
        where: { studentId: student.id },
        include: {
            university: { select: { id: true, institutionName: true, logo: true } },
            messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
            },
        },
        orderBy: { updatedAt: 'desc' },
    })

    // Attach unread count (messages from university that are unread)
    const withUnread = await Promise.all(
        conversations.map(async (c) => {
            const unreadCount = await prisma.directMessage.count({
                where: { conversationId: c.id, senderRole: 'UNIVERSITY', readAt: null },
            })
            return { ...c, unreadCount }
        })
    )

    return withUnread
}
