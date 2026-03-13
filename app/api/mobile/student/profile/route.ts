import { NextRequest, NextResponse } from 'next/server'
import { verifyMobileToken } from '@/lib/auth/mobile-verify'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    const token = await verifyMobileToken(req)
    if (!token || token.role !== 'STUDENT') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const student = await prisma.student.findUnique({
        where: { userId: token.sub },
        include: {
            user: { select: { id: true, name: true, email: true, image: true } },
        },
    })

    if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({
        id: student.id,
        name: student.user.name,
        email: student.user.email,
        image: student.user.image,
        phone: student.phone ?? null,
        country: student.country ?? null,
        city: student.city ?? null,
        program: student.currentStatus ?? null,      // closest field in schema
        intendedMajor: student.fieldOfInterest ?? null,
        gpa: null,                                    // not in schema
        targetCountries: student.preferredCountries ? [student.preferredCountries] : [],
    })
}
