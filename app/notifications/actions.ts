'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function getUserNotifications() {
    const session = await auth()
    if (!session?.user) return { notifications: [], announcements: [], sponsored: [] }

    const role = session.user.role
    let notifications: any[] = []

    // Fix: Fetch user from DB to ensure we have relations (session might not have them)
    // Also session.user.student might be undefined in types even if present in JWT
    const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email! },
        include: { student: true, university: true }
    })

    if (!dbUser) return { notifications: [], announcements: [], sponsored: [] }

    // 1. Fetch Targeted Notifications
    if (role === "STUDENT" && dbUser.student) {
        notifications = await prisma.studentNotification.findMany({
            where: { studentId: dbUser.student.id },
            orderBy: { createdAt: "desc" },
            take: 20
        })
    } else if ((role === "UNIVERSITY" || role === "UNIVERSITY_REP") && dbUser.university) {
        // Note: For reps, we show university-wide notifications
        notifications = await prisma.universityNotification.findMany({
            where: { universityId: dbUser.university.id },
            orderBy: { createdAt: "desc" },
            take: 20
        })
    }

    // 2. Fetch Announcements
    // AdminAnnouncement targetAudience: ALL, STUDENT, UNIVERSITY
    const audienceFilter = role === "STUDENT" ? "STUDENT" : "UNIVERSITY"

    const announcements = await prisma.adminAnnouncement.findMany({
        where: {
            isActive: true,
            OR: [
                { targetAudience: "ALL" },
                { targetAudience: audienceFilter }
            ]
        },
        orderBy: { priority: "desc" } // High priority first, then normal (via DB sorting or code)
        // Note: Prisma string sort might not be "HIGH" > "NORMAL", so we might need JS sort if strict
    })

    // 3. Fetch Sponsored Content
    // We can filter by placement later in UI, fetching ALL active here for simplicity
    const sponsored = await prisma.sponsoredContent.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" }
    })

    return {
        notifications,
        announcements,
        sponsored
    }
}

export async function markNotificationRead(id: string, type: "STUDENT" | "UNIVERSITY") {
    const session = await auth()
    if (!session?.user) return { error: "Unauthorized" }

    try {
        if (type === "STUDENT") {
            await prisma.studentNotification.update({
                where: { id },
                data: { isRead: true }
            })
        } else {
            await prisma.universityNotification.update({
                where: { id },
                data: { isRead: true }
            })
        }
        return { success: true }
    } catch (error) {
        return { error: "Failed to update" }
    }
}
