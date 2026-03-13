import { NextRequest, NextResponse } from 'next/server'
import { verifyMobileToken } from '@/lib/auth/mobile-verify'
import { prisma } from '@/lib/prisma'

// GET /api/mobile/student/conversations/[conversationId]
// conversationId = universityId
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ conversationId: string }> }
) {
    const token = await verifyMobileToken(req)
    if (!token || token.role !== 'STUDENT') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { conversationId: universityId } = await params

    const [student, university] = await Promise.all([
        prisma.student.findUnique({ where: { userId: token.sub } }),
        prisma.university.findUnique({
            where: { id: universityId },
            select: { institutionName: true, logo: true },
        }),
    ])

    if (!student || !university) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const messages = await prisma.proactiveMessage.findMany({
        where: { studentId: student.id, universityId },
        orderBy: { sentAt: 'asc' },
    })

    // Mark all as opened
    await prisma.proactiveMessage.updateMany({
        where: { studentId: student.id, universityId, openedAt: null },
        data: { openedAt: new Date() },
    })

    return NextResponse.json({
        universityName: university.institutionName,
        universityLogo: university.logo ?? null,
        messages: messages.map((m) => ({
            id: m.id,
            content: m.content,
            sentAt: m.sentAt.toISOString(),
            fromUniversity: true,   // ProactiveMessage is always from university
            status: m.status,
        })),
    })
}

// POST /api/mobile/student/conversations/[conversationId]/reply
// This is handled in a sub-route file; but we add reply here for simplicity
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ conversationId: string }> }
) {
    const token = await verifyMobileToken(req)
    if (!token || token.role !== 'STUDENT') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { conversationId: universityId } = await params
    const { message } = await req.json()

    if (!message?.trim()) {
        return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const student = await prisma.student.findUnique({ where: { userId: token.sub } })
    if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Mark latest message as REPLIED and record reply timestamp
    await prisma.proactiveMessage.updateMany({
        where: { studentId: student.id, universityId, status: 'SENT' },
        data: { status: 'REPLIED', repliedAt: new Date() },
    })

    // Create a new ProactiveMessage from student perspective (we invert it)
    // We store student replies as a new message with repId = null, indicating student origin
    const newMsg = await prisma.proactiveMessage.create({
        data: {
            studentId: student.id,
            universityId,
            content: message.trim(),
            status: 'REPLIED',
            sentAt: new Date(),
            repliedAt: new Date(),
        },
    })

    return NextResponse.json({
        id: newMsg.id,
        content: newMsg.content,
        sentAt: newMsg.sentAt.toISOString(),
        fromUniversity: false,
        status: newMsg.status,
    })
}
