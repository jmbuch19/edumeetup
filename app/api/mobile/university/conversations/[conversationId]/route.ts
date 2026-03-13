import { NextRequest, NextResponse } from 'next/server'
import { verifyMobileToken } from '@/lib/auth/mobile-verify'
import { prisma } from '@/lib/prisma'

// GET /api/mobile/university/conversations/[conversationId]
// conversationId = studentId
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ conversationId: string }> }
) {
    const token = await verifyMobileToken(req)
    if (!token || !['UNIVERSITY', 'UNIVERSITY_REP'].includes(token.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { conversationId: studentId } = await params

    const university = await prisma.university.findUnique({
        where: { userId: token.sub },
        select: { id: true },
    })
    if (!university) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: { user: { select: { name: true, image: true } } },
    })
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

    const messages = await prisma.proactiveMessage.findMany({
        where: { studentId, universityId: university.id },
        orderBy: { sentAt: 'asc' },
    })

    return NextResponse.json({
        studentName: student.user.name ?? 'Student',
        studentImage: student.user.image ?? null,
        messages: messages.map((m) => ({
            id: m.id,
            content: m.content,
            sentAt: m.sentAt.toISOString(),
            // repId null = sent by student (reply), repId set = sent by university
            fromUniversity: m.repId !== null || m.status === 'SENT',
            status: m.status,
        })),
    })
}

// POST /api/mobile/university/conversations/[conversationId]
// Send a new proactive message to the student
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ conversationId: string }> }
) {
    const token = await verifyMobileToken(req)
    if (!token || !['UNIVERSITY', 'UNIVERSITY_REP'].includes(token.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { conversationId: studentId } = await params
    const { message } = await req.json()

    if (!message?.trim()) {
        return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const [university, rep] = await Promise.all([
        prisma.university.findUnique({ where: { userId: token.sub }, select: { id: true } }),
        prisma.user.findUnique({ where: { id: token.sub }, select: { id: true } }),
    ])
    if (!university || !rep) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const newMsg = await prisma.proactiveMessage.create({
        data: {
            studentId,
            universityId: university.id,
            repId: rep.id,
            content: message.trim(),
            status: 'SENT',
        },
    })

    return NextResponse.json({
        id: newMsg.id,
        content: newMsg.content,
        sentAt: newMsg.sentAt.toISOString(),
        fromUniversity: true,
        status: newMsg.status,
    })
}
