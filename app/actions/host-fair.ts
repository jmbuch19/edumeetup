'use server'

import { hostRequestSchema, HostRequestFormValues } from "@/lib/host-fair-schema"
import { prisma } from "@/lib/prisma"
import { sendEmail, EmailTemplates, generateEmailHtml, EMAIL_STYLES } from "@/lib/email"
import { revalidatePath } from "next/cache"

export type ActionResponse = {
    success: boolean
    message?: string
    errors?: Record<string, string[]> // Zod field errors
    referenceNumber?: string
}

export async function submitHostRequest(data: HostRequestFormValues): Promise<ActionResponse> {
    const validated = hostRequestSchema.safeParse(data)

    if (!validated.success) {
        return {
            success: false,
            message: "Please fix the errors in the form",
            errors: validated.error.flatten().fieldErrors
        }
    }

    const {
        institutionName, institutionType, city, state, websiteUrl,
        contactName, contactDesignation, contactEmail, contactPhone,
        preferredDateStart, preferredDateEnd, expectedStudentCount,
        preferredCountries, fieldsOfStudy, additionalRequirements
    } = validated.data

    try {
        // Generate Reference Number: HCF-YYYY-XXX
        const year = new Date().getFullYear()

        // Count existing requests for this year to generate sequence
        // Note: This is not strictly atomic but sufficient for MVP low volume. 
        // For high volume, would need a sequence table or atomic increment.
        const count = await prisma.hostRequest.count({
            where: {
                createdAt: {
                    gte: new Date(`${year}-01-01`),
                    lt: new Date(`${year + 1}-01-01`)
                }
            }
        })

        const sequence = (count + 1).toString().padStart(3, '0')
        const referenceNumber = `HCF-${year}-${sequence}`

        // Create Record
        const newRequest = await prisma.hostRequest.create({
            data: {
                referenceNumber,
                institutionName,
                institutionType,
                city,
                state,
                websiteUrl,
                contactName,
                contactDesignation,
                contactEmail,
                contactPhone,
                preferredDateStart,
                preferredDateEnd,
                expectedStudentCount,
                preferredCountries, // Prisma handles JSON automatically
                fieldsOfStudy,      // Prisma handles JSON automatically
                additionalRequirements,
                status: "SUBMITTED"
            }
        })

        // Log Audit (Using generic SYSTEM actor since public form has no user ID)
        await prisma.auditLog.create({
            data: {
                action: "HOST_REQUEST_SUBMITTED",
                entityType: "HostRequest",
                entityId: newRequest.id,
                actorId: "SYSTEM_PUBLIC_FORM",
                metadata: JSON.stringify({ referenceNumber, institutionName })
            }
        })

        // Send Confirmation Email to Institution
        await sendEmail({
            to: contactEmail,
            subject: `Campus Fair Request Received: ${referenceNumber}`,
            html: generateEmailHtml(
                "Request Received",
                EmailTemplates.hostRequestConfirmation(referenceNumber, contactName)
            )
        })

        // Send Alert Email to Admin
        const ADMIN_EMAIL = process.env.GMAIL_USER || "jaydeep@edumeetup.com"
        await sendEmail({
            to: ADMIN_EMAIL,
            subject: `[ACTION REQUIRED] New Host Request: ${institutionName}`,
            html: generateEmailHtml(
                "New Host Request",
                EmailTemplates.hostRequestAlert(referenceNumber, institutionName, city)
            )
        })

        revalidatePath('/admin/host-requests')

        return {
            success: true,
            referenceNumber
        }

    } catch (error) {
        console.error("Failed to submit host request:", error)
        return {
            success: false,
            message: "An internal error occurred. Please try again later."
        }
    }
}
