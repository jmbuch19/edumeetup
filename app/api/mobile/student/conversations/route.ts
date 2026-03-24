import { NextRequest, NextResponse } from 'next/server'
import { verifyMobileToken } from '@/lib/auth/mobile-verify'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    const token = await verifyMobileToken(req)
    if (!token || token.role !== 'STUDENT') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const student = await prisma.student.findUnique({ where: { userId: token.sub } })
    if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const messages = await prisma.proactiveMessage.findMany({
        where: { studentId: student.id },
        orderBy: { sentAt: 'desc' },
    })

    // Batch-load universities
    const uniIds = [...new Set(messages.map((m: any) => m.universityId))]
    const universities = await prisma.university.findMany({
        where: { id: { in: uniIds } },
        select: { id: true, institutionName: true, logo: true },
    })
    const uniMap = new Map<string, any>(universities.map((u: any) => [u.id, u]))

    // Group by university
    const convMap = new Map<string, {
        id: string
        otherPartyName: string
        otherPartyImage: string | null
        lastMessage: string
        lastMessageAt: string
        unreadCount: number
    }>()

    for (const msg of messages) {
        const uid = msg.universityId
        const uni = uniMap.get(uid)
        if (!convMap.has(uid)) {
            convMap.set(uid, {
                id: uid,
                otherPartyName: uni?.institutionName ?? 'University',
                otherPartyImage: uni?.logo ?? null,
                lastMessage: msg.content,
                lastMessageAt: msg.sentAt.toISOString(),
                unreadCount: 0,
            })
        }
        if (!msg.openedAt) convMap.get(uid)!.unreadCount++
    }

    return NextResponse.json(Array.from(convMap.values()))
}
