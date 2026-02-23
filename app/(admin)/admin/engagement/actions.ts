'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

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
        await prisma.adminAnnouncement.create({
            data: {
                title,
                content,
                targetAudience: targetAudience || "ALL",
                priority: priority || "NORMAL",
                announcementType: announcementType || "GENERAL",
                sentById: session.user.id
            }
        })
        revalidatePath("/admin/engagement")
        return { success: true }
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
