'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function getUserNotifications() {
    const session = await auth()
    if (!session?.user) return { notifications: [], announcements: [], sponsored: [], fairInvitationMap: {}, fairEventsMap: {}, universityPrograms: [] }

    const role = session.user.role
    let notifications: any[] = []

    const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email! },
        include: { student: true, university: true }
    })

    if (!dbUser) return { notifications: [], announcements: [], sponsored: [], fairInvitationMap: {}, fairEventsMap: {}, universityPrograms: [] }

    // 1. Fetch Targeted Notifications — undismissed only
    if (role === "STUDENT" && dbUser.student) {
        notifications = await prisma.studentNotification.findMany({
            where: { studentId: dbUser.student.id, dismissed: false },
            orderBy: { createdAt: "desc" },
            take: 20
        })
    } else if ((role === "UNIVERSITY" || role === "UNIVERSITY_REP") && dbUser.university) {
        notifications = await prisma.universityNotification.findMany({
            where: { universityId: dbUser.university.id, dismissed: false },
            orderBy: { createdAt: "desc" },
            take: 20
        })
    }

    // 2. Fetch Announcements
    const audienceFilter = role === "STUDENT" ? "STUDENT" : "UNIVERSITY"
    const announcements = await prisma.adminAnnouncement.findMany({
        where: {
            isActive: true,
            OR: [
                { targetAudience: "ALL" },
                { targetAudience: audienceFilter }
            ]
        },
        orderBy: { priority: "desc" }
    })

    // 3. Fetch Sponsored Content
    const sponsored = await prisma.sponsoredContent.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" }
    })

    // For university users: single-query FairInvitation fetch + FairEvent details for FAIR_INVITE notifications
    let fairInvitationMap: Record<string, {
        id: string
        status: 'PENDING' | 'CONFIRMED' | 'DECLINED'
        respondedAt: string | null
    }> = {}
    let fairEventsMap: Record<string, any> = {}
    let universityProgramNames: { id: string; name: string; degreeLevel: string | null }[] = []

    if ((role === "UNIVERSITY" || role === "UNIVERSITY_REP") && dbUser.university) {
        const [invitations, programs] = await Promise.all([
            prisma.fairInvitation.findMany({
                where: { universityId: dbUser.university.id },
            }),
            prisma.program.findMany({
                where: { universityId: dbUser.university.id },
                select: { id: true, programName: true, degreeLevel: true },
            }),
        ])

        fairInvitationMap = Object.fromEntries(
            invitations.map((inv: any) => [inv.fairEventId, {
                id: inv.id,
                status: inv.status as 'PENDING' | 'CONFIRMED' | 'DECLINED',
                respondedAt: inv.respondedAt?.toISOString() ?? null,
            }])
        )

        // Fetch FairEvent details for all FAIR_INVITE notifications
        const fairEventIds = notifications
            .filter((n: any) => n.type === 'FAIR_INVITE')
            .map((n: any) => {
                const meta = n.metadata as Record<string, string> | null
                return meta?.fairEventId ?? null
            })
            .filter(Boolean) as string[]

        if (fairEventIds.length > 0) {
            const fairs = await prisma.fairEvent.findMany({
                where: { id: { in: fairEventIds } },
                select: {
                    id: true, name: true, city: true, venue: true, startDate: true, rsvpDeadline: true,
                },
            })
            const passCounts = await prisma.fairStudentPass.groupBy({
                by: ['fairEventId'],
                where: { fairEventId: { in: fairEventIds } },
                _count: { id: true },
            })
            const countMap = Object.fromEntries(passCounts.map((pc: any) => [pc.fairEventId, pc._count.id]))
            fairEventsMap = Object.fromEntries(fairs.map((f: any) => [f.id, {
                id: f.id,
                name: f.name,
                city: f.city,
                venue: f.venue,
                startDate: f.startDate.toISOString(),
                rsvpDeadline: f.rsvpDeadline?.toISOString() ?? null,
                totalRegistered: countMap[f.id] ?? 0,
            }]))
        }

        universityProgramNames = programs.map((p: any) => ({ id: p.id, name: p.programName, degreeLevel: p.degreeLevel ?? null }))
    }

    return { notifications, announcements, sponsored, fairInvitationMap, fairEventsMap, universityPrograms: universityProgramNames }
}

export async function markNotificationRead(id: string, type: "STUDENT" | "UNIVERSITY") {
    const session = await auth()
    if (!session?.user) return { error: "Unauthorized" }

    try {
        if (type === "STUDENT") {
            await prisma.studentNotification.update({ where: { id }, data: { isRead: true } })
        } else {
            await prisma.universityNotification.update({ where: { id }, data: { isRead: true } })
        }
        return { success: true }
    } catch {
        return { error: "Failed to update" }
    }
}

export async function dismissNotification(id: string, type: "STUDENT" | "UNIVERSITY") {
    const session = await auth()
    if (!session?.user) return { error: "Unauthorized" }

    const now = new Date()
    try {
        if (type === "STUDENT") {
            await prisma.studentNotification.update({
                where: { id },
                data: { dismissed: true, dismissedAt: now, isRead: true }
            })
        } else {
            await prisma.universityNotification.update({
                where: { id },
                data: { dismissed: true, dismissedAt: now, isRead: true }
            })
        }
        return { success: true }
    } catch {
        return { error: "Failed to dismiss" }
    }
}

export async function dismissAllNotifications(type: "STUDENT" | "UNIVERSITY") {
    const session = await auth()
    if (!session?.user) return { error: "Unauthorized" }

    const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email! },
        include: { student: true, university: true }
    })
    if (!dbUser) return { error: "User not found" }

    const now = new Date()
    try {
        if (type === "STUDENT" && dbUser.student) {
            await prisma.studentNotification.updateMany({
                where: { studentId: dbUser.student.id, dismissed: false },
                data: { dismissed: true, dismissedAt: now, isRead: true }
            })
        } else if (type === "UNIVERSITY" && dbUser.university) {
            await prisma.universityNotification.updateMany({
                where: { universityId: dbUser.university.id, dismissed: false },
                data: { dismissed: true, dismissedAt: now, isRead: true }
            })
        }
        return { success: true }
    } catch {
        return { error: "Failed to dismiss all" }
    }
}
