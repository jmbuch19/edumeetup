import { NextRequest, NextResponse } from 'next/server'
import { verifyMobileToken } from '@/lib/auth/mobile-verify'
import { prisma } from '@/lib/prisma'

// GET /api/mobile/university/conversations
export async function GET(req: NextRequest) {
    const token = await verifyMobileToken(req)
    if (!token || !['UNIVERSITY', 'UNIVERSITY_REP'].includes(token.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const university = await prisma.university.findUnique({
        where: { userId: token.sub },
        select: { id: true },
    })
    if (!university) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const messages = await prisma.proactiveMessage.findMany({
        where: { universityId: university.id },
        include: {
            student: {
                include: { user: { select: { name: true, image: true } } },
            },
        },
        orderBy: { sentAt: 'desc' },
    })

    // Group by student
    const studentMap = new Map<string, {
        id: string
        otherPartyName: string
        otherPartyImage: string | null
        lastMessage: string
        lastMessageAt: string
        unreadCount: number
    }>()

    for (const msg of messages) {
        const sid = msg.studentId
        if (!studentMap.has(sid)) {
            studentMap.set(sid, {
                id: sid,
                otherPartyName: msg.student.user.name ?? 'Student',
                otherPartyImage: msg.student.user.image,
                lastMessage: msg.content,
                lastMessageAt: msg.sentAt.toISOString(),
                unreadCount: msg.status === 'REPLIED' ? 1 : 0,
            })
        } else if (msg.status === 'REPLIED') {
            studentMap.get(sid)!.unreadCount++
        }
    }

    return NextResponse.json(Array.from(studentMap.values()))
}
