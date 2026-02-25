'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { sendEmail, sendMarketingEmail, generateEmailHtml, EmailTemplates } from "@/lib/email"

export async function createAnnouncement(formData: FormData) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") return { error: "Unauthorized" }

    const title = formData.get("title") as string
    const content = formData.get("content") as string
    const targetAudience = formData.get("targetAudience") as string
    const priority = formData.get("priority") as string
    const announcementType = formData.get("announcementType") as string

    if (!title || !content) return { error: "Missing required fields" }

    try {
        const announcement = await prisma.adminAnnouncement.create({
            data: {
                title,
                content,
                targetAudience: targetAudience || "ALL",
                priority: priority || "NORMAL",
                announcementType: announcementType || "GENERAL",
                sentById: session.user.id
            }
        })

        // ── Email broadcast ──────────────────────────────────────────────
        // Build role filter based on targetAudience
        const roleFilter =
            targetAudience === "STUDENT" ? { role: 'STUDENT' as const } :
                targetAudience === "UNIVERSITY" ? { role: { in: ['UNIVERSITY', 'UNIVERSITY_REP'] as ('UNIVERSITY' | 'UNIVERSITY_REP')[] } } :
                    {} // ALL — no filter

        const recipients = await prisma.user.findMany({
            where: { isActive: true, ...roleFilter },
            select: { email: true, name: true }
        })

        const emailHtml = generateEmailHtml(title, EmailTemplates.announcement(title, content))

        // Send in background — respects consentMarketing (announcements are marketing)
        for (const recipient of recipients) {
            await sendMarketingEmail({
                userEmail: recipient.email,
                to: recipient.email,
                subject: `[edUmeetup] ${title}`,
                html: emailHtml
            })
        }

        revalidatePath("/admin/engagement")
        return { success: true, emailedCount: recipients.length }
    } catch (error) {
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
                placement, // SIDEBAR, FEED, BANNER
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
