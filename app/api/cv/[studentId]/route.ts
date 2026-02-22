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

    // Access control: only admin, university, or the student themselves
    if (role === 'STUDENT') {
        const ownStudent = await prisma.student.findFirst({ where: { userId: session.user.id } })
        if (!ownStudent || ownStudent.id !== studentId) {
            return new NextResponse('Forbidden', { status: 403 })
        }
    } else if (role !== 'ADMIN' && role !== 'UNIVERSITY') {
        return new NextResponse('Forbidden', { status: 403 })
    }

    const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { cvData: true, cvFileName: true },
    })

    if (!student?.cvData) {
        return new NextResponse('No CV found for this student', { status: 404 })
    }

    const fileName = student.cvFileName ?? 'student_cv.pdf'

    return new NextResponse(new Uint8Array(student.cvData), {
        status: 200,
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${fileName}"`,
            'Cache-Control': 'private, no-store',
        },
    })
}
