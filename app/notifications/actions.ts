'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function getUserNotifications() {
    const session = await auth()
    if (!session?.user) return { notifications: [], announcements: [], sponsored: [] }

    const role = session.user.role
    let notifications: any[] = []

    const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email! },
        include: { student: true, university: true }
    })

    if (!dbUser) return { notifications: [], announcements: [], sponsored: [] }

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

    return { notifications, announcements, sponsored }
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
