import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { notifyUniversity } from '@/lib/notify'
import { studentQuestionSchema } from '@/lib/schemas'

export async function POST(req: Request) {
    try {
        const user = await requireUser()
        if (user.role !== 'STUDENT') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await req.json()
        const validation = studentQuestionSchema.safeParse(body)
        
        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid input data' }, { status: 400 })
        }

        const { universityId, programId, message } = validation.data

        const student = await prisma.student.findUnique({
            where: { userId: user.id },
            include: { user: true }
        })
        if (!student) return NextResponse.json({ error: 'Student profile not found' }, { status: 404 })

        const university = await prisma.university.findUnique({
            where: { id: universityId },
            include: { user: true }
        })
        if (!university) return NextResponse.json({ error: 'University not found' }, { status: 404 })

        let conversation = await prisma.conversation.findUnique({
            where: {
                studentId_universityId: {
                    studentId: student.id,
                    universityId
                }
            }
        })

        if (!conversation) {
            conversation = await prisma.conversation.create({
                data: {
                    studentId: student.id,
                    universityId
                }
            })
        }

        const dbMessage = await prisma.directMessage.create({
            data: {
                conversationId: conversation.id,
                senderId: user.id,
                senderRole: 'STUDENT',
                content: message,
                studentReadAt: new Date()
            }
        })

        await notifyUniversity(universityId, {
            title: 'New Message from Student',
            message: `${student.fullName}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`,
            type: 'INFO',
            actionUrl: `/university/messages`
        })

        return NextResponse.json({ success: true, messageId: dbMessage.id })
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Internal Error' }, { status: 500 })
    }
}
