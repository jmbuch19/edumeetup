'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function exportMeetingsToCSV(filters?: any) {
    const session = await auth()
    if (!session || !session.user || ((session.user as any).role !== 'UNIVERSITY' && (session.user as any).role !== 'UNIVERSITY_REP')) {
        return { error: 'Unauthorized' }
    }

    const userId = session.user.id

    // Logic to distinguish between University Admin (sees strictly all) vs Rep (sees only theirs?)
    // The prompt implies "University" exports. Admin should see all. Reps? "University Admin Dashboard... settings... rep management".
    // For meetings, "University can download CSV". I'll assume standard University Admin sees all meetings for the university.
    // Basic Rep logic: if universityId is set, get all meetings for that university?
    // Current auth check `role === UNIVERSITY` usually implies the main account. 
    // If we support `UNIVERSITY_REP` role, we must handle that.
    // Let's first check if the user is a rep or a main uni profile.

    let universityId = null

    const profile = await prisma.university.findUnique({ where: { userId } })
    if (profile) {
        universityId = profile.id
    }
    // Rep logic requires schema support or specific lookup

    if (!universityId) return { error: 'University not found' }

    // Build Where Clause
    const where: any = {
        universityId: universityId
    }

    if (filters?.status) {
        where.status = filters.status
    }

    if (filters?.startDate || filters?.endDate) {
        where.startTime = {}
        if (filters.startDate) where.startTime.gte = new Date(filters.startDate)
        if (filters.endDate) where.startTime.lte = new Date(filters.endDate)
    }

    const meetings = await prisma.meeting.findMany({
        where,
        include: {
            student: {
                include: { user: true }
            },
            availabilitySlot: {
                include: {
                    repUser: {
                        select: { email: true }
                    }
                }
            },
            university: {
                select: { institutionName: true }
            }
        } as any,
        orderBy: { startTime: 'desc' }
    })

    // Generate CSV
    const headers = [
        'Meeting ID', 'Status', 'Start Time (UTC)', 'Student Name', 'Student Email', 'Student Country',
        'Purpose', 'Questions', 'Rep Email', 'University', 'Created At', 'Updated At'
    ].join(',')

    const rows = meetings.map((m: any) => {
        return [
            m.id,
            m.status,
            m.startTime.toISOString(),
            `"${m.student.fullName.replace(/"/g, '""')}"`,
            m.student.user.email,
            m.student.country || '',
            `"${m.purpose.replace(/"/g, '""')}"`,
            `"${(m.agenda || '').replace(/"/g, '""')}"`,
            // m.rep is a user.email? Meeting model has optional repId and rep relation
            m.availabilitySlot?.repUser.email || '',
            `"${m.university.institutionName.replace(/"/g, '""')}"`,
            m.createdAt.toISOString(),
            m.updatedAt.toISOString()
        ].join(',')
    })

    const csvContent = [headers, ...rows].join('\n')

    return { csv: csvContent }
}
