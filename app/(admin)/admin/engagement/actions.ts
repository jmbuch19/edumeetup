'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { sendMarketingEmail, generateEmailHtml, EmailTemplates } from "@/lib/email"

const ALLOWED_ANNOUNCEMENT_TYPES = ['GENERAL', 'NEW_UNIVERSITY', 'CHECK_IN', 'PHYSICAL_FAIR', 'SPONSOR_ONBOARD'] as const

export async function createAnnouncement(formData: FormData) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") return { error: "Unauthorized" }

    const title = formData.get("title") as string
    const content = formData.get("content") as string
    const targetAudience = formData.get("targetAudience") as string
    const priority = formData.get("priority") as string
    const announcementType = (formData.get("announcementType") as string) || "GENERAL"

    if (!title || !content) return { error: "Missing required fields" }

    if (!ALLOWED_ANNOUNCEMENT_TYPES.includes(announcementType as any)) {
        return { error: "Invalid announcement type" }
    }

    try {
        await prisma.adminAnnouncement.create({
            data: {
                title,
                content,
                targetAudience: targetAudience || "ALL",
                priority: priority || "NORMAL",
                announcementType,
                sentById: session.user.id
            }
        })

        const isStudentTarget = targetAudience === "STUDENT" || targetAudience === "ALL" || !targetAudience
        const isUniTarget = targetAudience === "UNIVERSITY" || targetAudience === "ALL" || !targetAudience

        const emailHtml = generateEmailHtml(title, EmailTemplates.announcement(title, content))
        let emailedCount = 0
        let notifiedCount = 0

        // ── Students: in-app bell + email ────────────────────────────────
        if (isStudentTarget) {
            const students = await prisma.student.findMany({
                where: { user: { isActive: true } },
                select: {
                    id: true,
                    user: { select: { email: true, consentMarketing: true } }
                }
            })

            // Bulk in-app bell (no consent gate — admin messages always appear in bell)
            if (students.length > 0) {
                await prisma.studentNotification.createMany({
                    data: students.map(s => ({
                        studentId: s.id,
                        title,
                        message: content,
                        type: 'INFO',
                        actionUrl: null,
                    })),
                    skipDuplicates: true,
                })
                notifiedCount += students.length
            }

            // Email only to those who consented to marketing
            for (const s of students) {
                if (s.user.consentMarketing) {
                    await sendMarketingEmail({
                        userEmail: s.user.email,
                        to: s.user.email,
                        subject: `[edUmeetup] ${title}`,
                        html: emailHtml
                    })
                    emailedCount++
                }
            }
        }

        // ── Universities: in-app bell + email ────────────────────────────
        if (isUniTarget) {
            const universities = await prisma.university.findMany({
                where: { user: { isActive: true } },
                select: {
                    id: true,
                    user: { select: { email: true, consentMarketing: true } }
                }
            })

            if (universities.length > 0) {
                await prisma.universityNotification.createMany({
                    data: universities.map(u => ({
                        universityId: u.id,
                        title,
                        message: content,
                        type: 'INFO',
                        actionUrl: null,
                    })),
                    skipDuplicates: true,
                })
                notifiedCount += universities.length
            }

            for (const u of universities) {
                if (u.user.consentMarketing) {
                    await sendMarketingEmail({
                        userEmail: u.user.email,
                        to: u.user.email,
                        subject: `[edUmeetup] ${title}`,
                        html: emailHtml
                    })
                    emailedCount++
                }
            }
        }

        revalidatePath("/admin/engagement")
        return { success: true, emailedCount, notifiedCount }
    } catch (error) {
        console.error("[createAnnouncement]", error)
        return { error: "Failed to create announcement" }
    }
}

export async function getAnnouncements() {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") return []

    return await prisma.adminAnnouncement.findMany({
        orderBy: { createdAt: "desc" }
    })
}

export async function deleteAnnouncement(id: string) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") return { error: "Unauthorized" }

    try {
        await prisma.adminAnnouncement.delete({ where: { id } })
        revalidatePath("/admin/engagement")
        return { success: true }
    } catch (error) {
        return { error: "Failed to delete" }
    }
}

// -----------------------------------------------------------------------------
// Sponsored Content Actions
// -----------------------------------------------------------------------------

export async function createSponsoredContent(formData: FormData) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") return { error: "Unauthorized" }

    const title = formData.get("title") as string
    const partnerName = formData.get("partnerName") as string
    const imageUrl = formData.get("imageUrl") as string
    const targetUrl = formData.get("targetUrl") as string
    const placement = formData.get("placement") as string

    if (!title || !imageUrl || !targetUrl) return { error: "Missing fields" }

    try {
        await prisma.sponsoredContent.create({
            data: {
                title,
                partnerName,
                imageUrl,
                targetUrl,
                placement,
                isActive: true
            }
        })
        revalidatePath("/admin/engagement")
        return { success: true }
    } catch (error) {
        return { error: "Failed to create sponsored content" }
    }
}

export async function getSponsoredContent() {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") return []

    return await prisma.sponsoredContent.findMany({
        orderBy: { createdAt: "desc" }
    })
}

export async function deleteSponsoredContent(id: string) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") return { error: "Unauthorized" }

    try {
        await prisma.sponsoredContent.delete({ where: { id } })
        revalidatePath("/admin/engagement")
        return { success: true }
    } catch (error) {
        return { error: "Failed to delete" }
    }
}
