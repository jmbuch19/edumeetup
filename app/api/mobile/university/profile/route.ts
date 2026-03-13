import { NextRequest, NextResponse } from 'next/server'
import { verifyMobileToken } from '@/lib/auth/mobile-verify'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    const token = await verifyMobileToken(req)
    if (!token || !['UNIVERSITY', 'UNIVERSITY_REP'].includes(token.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const university = await prisma.university.findUnique({
        where: { userId: token.sub },
        select: { id: true, institutionName: true, country: true, logo: true, about: true, website: true },
    })
    if (!university) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({
        name: university.institutionName,
        country: university.country ?? null,
        logo: university.logo ?? null,
        description: university.about ?? null,
        website: university.website ?? null,
    })
}
