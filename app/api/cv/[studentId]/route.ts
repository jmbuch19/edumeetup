import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
    req: NextRequest,
    { params }: { params: { studentId: string } }
) {
    const session = await auth()
    if (!session?.user?.id) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    const { studentId } = params
    const role = session.user.role as string

    // Access control: admin, university (+ reps), or the student themselves
    if (role === 'STUDENT') {
        const ownStudent = await prisma.student.findFirst({ where: { userId: session.user.id } })
        if (!ownStudent || ownStudent.id !== studentId) {
            return new NextResponse('Forbidden', { status: 403 })
        }
    } else if (role !== 'ADMIN' && role !== 'UNIVERSITY' && role !== 'UNIVERSITY_REP') {
        return new NextResponse('Forbidden', { status: 403 })
    }

    const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { cvUrl: true, cvFileName: true },
    })

    if (!student?.cvUrl) {
        return new NextResponse('No CV found for this student', { status: 404 })
    }

    // CV is now a redirect to the R2 URL — no binary data served from DB
    return NextResponse.redirect(student.cvUrl)
}
