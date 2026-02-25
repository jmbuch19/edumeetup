import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/my-data
 * Returns all data held for the authenticated user as a JSON export.
 * Scoped by role: student data vs university data.
 */
export async function GET(_req: NextRequest) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const role = session.user.role

    // Always fetch base user + consent history + audit logs
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            emailVerified: true,
            createdAt: true,
            consentMarketing: true,
            consentAnalytics: true,
            consentWithdrawnAt: true,
            deletionRequestedAt: true,
            deletionScheduledFor: true,
            consentHistory: {
                orderBy: { changedAt: 'desc' },
                select: { field: true, oldValue: true, newValue: true, changedAt: true }
            },
        }
    })

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let profileData: Record<string, unknown> = {}

    if (role === 'STUDENT') {
        const student = await prisma.student.findFirst({
            where: { userId },
            include: {
                interests: {
                    include: {
                        university: { select: { institutionName: true, country: true } },
                        program: { select: { programName: true, degreeLevel: true } }
                    }
                },
                meetings: {
                    select: {
                        id: true, title: true, startTime: true, durationMinutes: true,
                        status: true, meetingType: true, joinUrl: true, createdAt: true
                    }
                },
                advisoryRequests: {
                    select: {
                        id: true, targetDegree: true, fieldOfInterest: true, targetCountry: true,
                        budgetRange: true, status: true, createdAt: true
                    }
                },
                bookmarks: {
                    include: { university: { select: { institutionName: true } } }
                },
                changeLogs: {
                    orderBy: { changedAt: 'desc' },
                    take: 50,
                    select: { version: true, changedFields: true, changedAt: true }
                },
                notifications: { orderBy: { createdAt: 'desc' }, take: 100 },
                eventRegistrations: { include: { event: { select: { title: true, dateTime: true } } } },
            }
        })

        const supportTickets = await prisma.supportTicket.findMany({
            where: { userId },
            select: { id: true, category: true, priority: true, status: true, message: true, createdAt: true }
        })

        const auditLogs = await prisma.auditLog.findMany({
            where: { actorId: userId },
            orderBy: { createdAt: 'desc' },
            select: { id: true, action: true, entityType: true, entityId: true, metadata: true, createdAt: true }
        })

        profileData = { student, supportTickets, auditLogs }

    } else if (role === 'UNIVERSITY' || role === 'UNIVERSITY_REP') {
        const university = await prisma.university.findFirst({
            where: { userId },
            include: {
                programs: {
                    select: {
                        id: true, programName: true, degreeLevel: true, fieldCategory: true,
                        durationMonths: true, tuitionFee: true, currency: true, status: true,
                        stemDesignated: true, englishTests: true, minEnglishScore: true,
                        intakes: true, description: true, createdAt: true
                    }
                },
                interests: {
                    include: {
                        student: { select: { fullName: true, country: true, fieldOfInterest: true } }
                    }
                },
                meetings: {
                    select: {
                        id: true, title: true, startTime: true, durationMinutes: true,
                        status: true, meetingType: true, createdAt: true
                    }
                },
                documents: { select: { displayName: true, category: true, fileName: true, uploadedAt: true } },
                reps: { select: { id: true, email: true, name: true, role: true, createdAt: true } },
                notifications: { orderBy: { createdAt: 'desc' }, take: 100 },
            }
        })

        const supportTickets = await prisma.supportTicket.findMany({
            where: { userId },
            select: { id: true, category: true, priority: true, status: true, message: true, createdAt: true }
        })

        const auditLogs = await prisma.auditLog.findMany({
            where: { actorId: userId },
            orderBy: { createdAt: 'desc' },
            select: { id: true, action: true, entityType: true, entityId: true, metadata: true, createdAt: true }
        })

        profileData = { university, supportTickets, auditLogs }
    }

    const exportData = {
        exportedAt: new Date().toISOString(),
        exportedBy: userId,
        account: user,
        ...profileData,
    }

    return NextResponse.json(exportData, {
        headers: {
            'Content-Disposition': `attachment; filename="edumeetup-my-data-${new Date().toISOString().split('T')[0]}.json"`,
            'Content-Type': 'application/json',
        }
    })
}
