'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { sendEmail, EmailTemplates, generateEmailHtml } from "@/lib/email"
import { revalidatePath } from "next/cache"

export async function approveHostRequest(requestId: string) {
    const session = await auth()

    // Authorization Check
    if (!session?.user || session.user.role !== 'ADMIN') {
        return { success: false, message: "Unauthorized" }
    }

    try {
        const request = await prisma.hostRequest.update({
            where: { id: requestId },
            data: { status: 'APPROVED' }
        })

        // Send Approval Email
        await sendEmail({
            to: request.contactEmail,
            subject: `Request Approved: ${request.referenceNumber}`,
            html: generateEmailHtml(
                "Request Approved",
                EmailTemplates.hostRequestApproved(request.referenceNumber, request.contactName)
            )
        })

        revalidatePath('/admin/host-requests')
        revalidatePath(`/admin/host-requests/${requestId}`)

        return { success: true }
    } catch (error) {
        console.error("Failed to approve request:", error)
        return { success: false, message: "Failed to approve request" }
    }
}

export async function rejectHostRequest(requestId: string, reason?: string) {
    const session = await auth()

    if (!session?.user || session.user.role !== 'ADMIN') {
        return { success: false, message: "Unauthorized" }
    }

    try {
        const request = await prisma.hostRequest.update({
            where: { id: requestId },
            data: { status: 'REJECTED' }
        })

        // Send Rejection Email to Host Institution
        await sendEmail({
            to: request.contactEmail,
            subject: `Campus Fair Request Update: ${request.referenceNumber}`,
            html: generateEmailHtml(
                'Campus Fair Request Update',
                EmailTemplates.hostRequestRejected(request.referenceNumber, request.contactName, reason)
            ),
            replyTo: process.env.SUPPORT_EMAIL
        })

        revalidatePath('/admin/host-requests')
        revalidatePath(`/admin/host-requests/${requestId}`)

        return { success: true }
    } catch (error) {
        console.error("Failed to reject request:", error)
        return { success: false, message: "Failed to reject request" }
    }
}
