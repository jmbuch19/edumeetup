import { NextRequest, NextResponse } from 'next/server'
import { verifyMobileToken } from '@/lib/auth/mobile-verify'
import { prisma } from '@/lib/prisma'

// GET /api/mobile/university/[universityId]/slots
// Returns university info + available meeting duration options for booking
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ universityId: string }> }
) {
    const token = await verifyMobileToken(req)
    if (!token || token.role !== 'STUDENT') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { universityId } = await params

    const [university, profiles] = await Promise.all([
        prisma.university.findUnique({
            where: { id: universityId },
            select: {
                id: true,
                institutionName: true,
                logo: true,
                about: true,
                country: true,
                programs: true,
                defaultDuration: true,
            },
        }),
        prisma.availabilityProfile.findMany({
            where: { universityId, isActive: true },
            select: {
                id: true,
                dayOfWeek: true,
                startTime: true,
                endTime: true,
                meetingDurationOptions: true,
                timezone: true,
                repUser: { select: { name: true } },
            },
        }),
    ])

    if (!university) return NextResponse.json({ error: 'University not found' }, { status: 404 })

    // Collect unique duration options across all profiles
    const durations = [...new Set(
        profiles.flatMap((p) => p.meetingDurationOptions)
    )].sort((a, b) => a - b)

    // Build available days summary
    const availability = profiles.map((p) => ({
        dayOfWeek: p.dayOfWeek,
        startTime: p.startTime,
        endTime: p.endTime,
        timezone: p.timezone,
        repName: p.repUser.name ?? 'University Rep',
    }))

    return NextResponse.json({
        university: {
            id: university.id,
            name: university.institutionName,
            logo: university.logo ?? null,
            about: university.about ?? null,
            country: university.country ?? null,
            programs: university.programs,
        },
        durations: durations.length > 0 ? durations : [university.defaultDuration],
        availability,
    })
}

// POST /api/mobile/university/[universityId]/slots — create a meeting request
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ universityId: string }> }
) {
    const token = await verifyMobileToken(req)
    if (!token || token.role !== 'STUDENT') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { universityId } = await params
    const { message, programId } = await req.json()

    const student = await prisma.student.findUnique({ where: { userId: token.sub } })
    if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Check for duplicate pending request
    const existing = await prisma.meetingRequest.findFirst({
        where: { studentId: student.id, universityId, status: 'PENDING' },
    })
    if (existing) {
        return NextResponse.json({ error: 'You already have a pending request with this university' }, { status: 409 })
    }

    const request = await prisma.meetingRequest.create({
        data: {
            studentId: student.id,
            universityId,
            programId: programId ?? null,
            message: message?.trim() ?? null,
            status: 'PENDING',
        },
    })

    return NextResponse.json({ success: true, requestId: request.id }, { status: 201 })
}
