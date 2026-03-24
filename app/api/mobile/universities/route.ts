import { NextRequest, NextResponse } from 'next/server'
import { verifyMobileToken } from '@/lib/auth/mobile-verify'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    const token = await verifyMobileToken(req)
    if (!token || token.role !== 'STUDENT') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const universities = await prisma.university.findMany({
        where: { verificationStatus: 'VERIFIED' },
        select: {
            id: true,
            institutionName: true,
            country: true,
            logo: true,
            about: true,
            programs: true,
            website: true,
        },
        orderBy: { institutionName: 'asc' },
    })

    return NextResponse.json(
        universities.map((u: any) => ({
            id: u.id,
            name: u.institutionName,
            country: u.country ?? 'Unknown',
            logo: u.logo ?? null,
            description: u.about ?? null,
            programs: u.programs ?? [],
            website: u.website ?? null,
        }))
    )
}
