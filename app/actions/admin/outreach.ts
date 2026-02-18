'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { sendEmail, EmailTemplates, generateEmailHtml } from "@/lib/email"
import { revalidatePath } from "next/cache"
import { format } from "date-fns"

export async function getVerifiedUniversities() {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') return []

    return await prisma.university.findMany({
        where: { isVerified: true },
        select: {
            id: true,
            institutionName: true,
            city: true,
            country: true
        },
        orderBy: { institutionName: 'asc' }
    })
}

export async function createOutreach(requestId: string, universityIds: string[]) {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
        return { success: false, message: "Unauthorized" }
    }

    try {
        const request = await prisma.hostRequest.findUnique({
            where: { id: requestId }
        })

        if (!request) return { success: false, message: "Request not found" }
        if (request.status === 'SUBMITTED') {
            // Auto-approve if sending outreach? 
            // Ideally status should be APPROVED first, but let's allow it or update it.
            // Let's stick to flow: Approve -> Outreach. But we can update logic.
            // For now, assume it's approved or just update status to OUTREACH_SENT if needed.
            // Let's update status to OUTREACH_SENT if it was APPROVED.
        }

        const dateRange = `${format(request.preferredDateStart, "MMM d")} - ${format(request.preferredDateEnd, "MMM d, yyyy")}`

        let count = 0

        for (const uniId of universityIds) {
            // Check existing
            const existing = await prisma.hostRequestOutreach.findFirst({
                where: { hostRequestId: requestId, universityId: uniId }
            })

            if (existing) continue // Skip if already sent

            // Get Uni Email
            const uni = await prisma.university.findUnique({
                where: { id: uniId },
                select: { contactEmail: true, user: { select: { email: true } } }
            })

            const targetEmail = uni?.contactEmail || uni?.user?.email
            if (!targetEmail) continue;

            // Create Record
            await prisma.hostRequestOutreach.create({
                data: {
                    hostRequestId: requestId,
                    universityId: uniId,
                    status: 'SENT'
                }
            })

            // Send Email
            await sendEmail({
                to: targetEmail,
                subject: `New Campus Fair Opportunity: ${request.institutionName}`,
                html: generateEmailHtml(
                    "New Opportunity",
                    EmailTemplates.hostRequestOpportunity(request.institutionName, request.city, dateRange)
                )
            })
            count++
        }

        // Update overall request status if not already Outreach Sent or Completed
        if (request.status === 'APPROVED' && count > 0) {
            await prisma.hostRequest.update({
                where: { id: requestId },
                data: { status: 'OUTREACH_SENT' }
            })
        }

        revalidatePath(`/admin/host-requests/${requestId}`)
        return { success: true, count }

    } catch (error) {
        console.error("Failed to create outreach:", error)
        return { success: false, message: "Failed to create outreach" }
    }
}
