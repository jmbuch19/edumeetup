import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUniversityForActor } from '@/lib/university-actor'

export async function GET(_req: NextRequest, props: { params: Promise<{ studentId: string }> }) {
    const { studentId } = await props.params
    const session = await auth()
    if (!session?.user?.id) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    if (!studentId || studentId.length > 100) {
        return new NextResponse('Not found', { status: 404 })
    }

    const role = String(session.user.role ?? '')

    if (role === 'STUDENT') {
        const ownStudent = await prisma.student.findUnique({
            where: { userId: session.user.id },
            select: { id: true },
        })
        if (!ownStudent || ownStudent.id !== studentId) {
            return new NextResponse('Forbidden', { status: 403 })
        }
    } else if (role === 'UNIVERSITY' || role === 'UNIVERSITY_REP') {
        const university = await getUniversityForActor(session.user.id, role)
        if (!university) return new NextResponse('Forbidden', { status: 403 })

        const relatedMeeting = await prisma.meeting.findFirst({
            where: {
                studentId,
                universityId: university.id,
                status: { not: 'CANCELLED' },
                ...(role === 'UNIVERSITY_REP' ? { repId: session.user.id } : {}),
            },
            select: { id: true },
        })
        if (!relatedMeeting) return new NextResponse('Forbidden', { status: 403 })
    } else if (role !== 'ADMIN') {
        return new NextResponse('Forbidden', { status: 403 })
    }

    const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { cvUrl: true },
    })

    if (!student?.cvUrl) {
        return new NextResponse('No CV found for this student', { status: 404 })
    }

    return NextResponse.redirect(student.cvUrl, {
        headers: { 'Cache-Control': 'private, no-store' },
    })
}
