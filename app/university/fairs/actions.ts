'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { sendEmail, EmailTemplates, generateEmailHtml } from "@/lib/email"

export async function getUniversityOutreach() {
    const session = await auth()
    if (!session || !session.user || session.user.role !== 'UNIVERSITY') return []

    const university = await prisma.university.findUnique({
        where: { userId: session.user.id }
    })

    if (!university) return []

    return await prisma.hostRequestOutreach.findMany({
        where: { universityId: university.id },
        include: {
            hostRequest: true // Details of the fair
        },
        orderBy: { sentAt: 'desc' }
    })
}

export async function respondToOutreach(outreachId: string, status: 'INTERESTED' | 'NOT_INTERESTED', note?: string) {
    const session = await auth()
    if (!session || !session.user || session.user.role !== 'UNIVERSITY') {
        return { error: "Unauthorized" }
    }

    try {
        // Verify ownership
        const university = await prisma.university.findUnique({
            where: { userId: session.user.id }
        })

        if (!university) return { error: "University not found" }

        const existing = await prisma.hostRequestOutreach.findUnique({
            where: { id: outreachId }
        })

        if (!existing || existing.universityId !== university.id) {
            return { error: "Invitation not found or access denied" }
        }

        // Update
        const updatedOutreach = await prisma.hostRequestOutreach.update({
            where: { id: outreachId },
            data: {
                status,
                responseNote: note,
                respondedAt: new Date()
            },
            include: {
                hostRequest: true,
                university: true
            }
        })

        // Notify Admin
        const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.GMAIL_USER || "info@edumeetup.com"

        await sendEmail({
            to: ADMIN_EMAIL,
            subject: `University Response: ${updatedOutreach.university.institutionName}`,
            html: generateEmailHtml(
                "University Response",
                EmailTemplates.universityResponse(
                    updatedOutreach.university.institutionName,
                    updatedOutreach.hostRequest.institutionName,
                    updatedOutreach.hostRequest.referenceNumber,
                    status,
                    note
                )
            )
        })

        revalidatePath('/university/fairs')
        return { success: true }
    } catch (error) {
        console.error("Failed to respond to outreach:", error)
        return { error: "Failed to submit response" }
    }
}
