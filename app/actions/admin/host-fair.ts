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
        const existingRequest = await prisma.hostRequest.findUnique({ where: { id: requestId } })
        if (!existingRequest) return { success: false, message: "Request not found" }

        let finalVenueId = existingRequest.venueId

        // If this is a Venue Nomination (OUT_OF_NETWORK)
        if (!finalVenueId) {
            if (!existingRequest.proposedCircuitId) {
                 return { success: false, message: "Cannot approve nomination without an assigned circuit." }
            }
            // Create the new Venue and instantly publish it
            const newVenue = await prisma.fairVenue.create({
                data: {
                    institutionName: existingRequest.institutionName,
                    city: existingRequest.city,
                    circuitId: existingRequest.proposedCircuitId,
                     isActive: true,
                     tier: "TIER2" // Default tier
                }
            })
            finalVenueId = newVenue.id
        }

        const request = await prisma.hostRequest.update({
            where: { id: requestId },
            data: { 
                status: 'APPROVED', 
                venueId: finalVenueId 
            }
        })

        const isNominationApproval = existingRequest.isNomination

        // Send Approval Email
        const emailTitle = isNominationApproval ? "Venue Nomination Accepted" : "Request Approved"
        const emailSubject = isNominationApproval ? `Nomination Accepted: ${request.referenceNumber}` : `Request Approved: ${request.referenceNumber}`

        await sendEmail({
            to: request.contactEmail,
            subject: emailSubject,
            html: generateEmailHtml(
                emailTitle,
                EmailTemplates.hostRequestApproved(request.referenceNumber, request.contactName)
            )
        })

        // Log to Audit
        await prisma.auditLog.create({
            data: {
                action: isNominationApproval ? "VENUE_NOMINATION_APPROVED" : "HOST_REQUEST_APPROVED",
                entityType: "HostRequest",
                entityId: request.id,
                actorId: session.user.id,
                metadata: JSON.stringify({ referenceNumber: request.referenceNumber })
            }
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

        // Log to Audit
        const isNominationRejection = request.isNomination
        await prisma.auditLog.create({
            data: {
                action: isNominationRejection ? "VENUE_NOMINATION_REJECTED" : "HOST_REQUEST_REJECTED",
                entityType: "HostRequest",
                entityId: request.id,
                actorId: session.user.id,
                metadata: JSON.stringify({ referenceNumber: request.referenceNumber, reason })
            }
        })

        revalidatePath('/admin/host-requests')
        revalidatePath(`/admin/host-requests/${requestId}`)

        return { success: true }
    } catch (error) {
        console.error("Failed to reject request:", error)
        return { success: false, message: "Failed to reject request" }
    }
}
