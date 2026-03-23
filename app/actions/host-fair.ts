'use server'

import { hostRequestSchema, HostRequestFormValues } from "@/lib/host-fair-schema"
import { prisma } from "@/lib/prisma"
import { verifyTurnstile } from "@/lib/turnstile"
import { sendEmail, EmailTemplates, generateEmailHtml, EMAIL_STYLES } from "@/lib/email"
import { revalidatePath } from "next/cache"

export type ActionResponse = {
    success: boolean
    message?: string
    errors?: Record<string, string[]> // Zod field errors
    referenceNumber?: string
}

export async function submitHostRequest(data: HostRequestFormValues): Promise<ActionResponse> {
    const turnstileResult = await verifyTurnstile(data.turnstileToken)
    if (!turnstileResult.success) {
        return { success: false, message: turnstileResult.error }
    }

    if (data._honeypot && data._honeypot.length > 0) {
        // Silent fake success — bot thinks it worked
        const fakeRef = `HCF-${new Date().getFullYear()}-${Math.floor(Math.random() * 999).toString().padStart(3, '0')}`
        return { success: true, referenceNumber: fakeRef }
    }

    const validated = hostRequestSchema.safeParse(data)

    if (!validated.success) {
        return {
            success: false,
            message: "Please fix the errors in the form",
            errors: validated.error.flatten().fieldErrors
        }
    }

    const {
        institutionName, institutionType, venueId, state, websiteUrl,
        contactName, contactDesignation, contactEmail, contactPhone,
        preferredDateStart, preferredDateEnd, expectedStudentCount,
        preferredCountries, fieldsOfStudy, additionalRequirements,
        proposedCircuitId
    } = validated.data

    try {
        // T11: Spam / Duplicate Limiter (24 hours)
        const recentDuplicate = await prisma.hostRequest.findFirst({
            where: {
                contactEmail: contactEmail.toLowerCase(),
                createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            }
        })
        if (recentDuplicate) {
            return { success: true, referenceNumber: recentDuplicate.referenceNumber }
        }
        // Generate Reference Number: HCF-YYYY-XXX
        const year = new Date().getFullYear()

        let actualCity = "N/A";
        let finalVenueId: string | null = venueId;
        let isNomination = false;

        // Validate and Fetch Venue
        if (venueId !== "OUT_OF_NETWORK") {
            const fairVenue = await prisma.fairVenue.findUnique({
                where: { id: venueId },
                include: { circuit: true }
            })
            if (!fairVenue) {
                 return { success: false, message: "Selected geographic venue is no longer active." }
            }
            actualCity = fairVenue.city;
        } else {
            finalVenueId = null;
            isNomination = true;
            actualCity = validated.data.city || "Out of Network City";
        }

        let newRequest: any = null;
        let referenceNumber = "";
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
            try {
                // Count existing requests for this year to generate sequence
                const count = await prisma.hostRequest.count({
                    where: {
                        createdAt: {
                            gte: new Date(`${year}-01-01`),
                            lt: new Date(`${year + 1}-01-01`)
                        }
                    }
                })

                const sequence = (count + 1 + retryCount).toString().padStart(3, '0')
                referenceNumber = `HCF-${year}-${sequence}`
                
                // Create Record
                newRequest = await prisma.hostRequest.create({
                    data: {
                        referenceNumber,
                        venueId: finalVenueId,
                        proposedCircuitId,
                        isNomination,
                        institutionName,
                        institutionType,
                        city: actualCity,
                        state: state || null,
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
                break; // Break loop if creation succeeds
            } catch (error: any) {
                if (error.code === 'P2002') {
                    retryCount++;
                    if (retryCount >= maxRetries) {
                        throw new Error("Server is exceedingly busy. Please try submitting again.");
                    }
                } else {
                    throw error;
                }
            }
        }

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
        try {
            const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL
            if (ADMIN_EMAIL) {
                let subjectType = `New Host Request: ${institutionName}`;
                let titleType = "New Host Request";

                if (proposedCircuitId) {
                    const circuit = await prisma.fairCircuit.findUnique({ where: { id: proposedCircuitId } });
                    if (circuit) {
                         subjectType = `New venue nomination: ${institutionName}, ${actualCity} — Circuit: ${circuit.name}`;
                         titleType = "New Venue Nomination";
                    }
                }

                await sendEmail({
                    to: ADMIN_EMAIL,
                    subject: `[ACTION REQUIRED] ${subjectType}`,
                    html: generateEmailHtml(
                        titleType,
                        EmailTemplates.hostRequestAlert(referenceNumber, institutionName, actualCity, contactName, contactEmail, contactPhone, isNomination)
                    )
                })
            } else {
                console.warn('ADMIN_NOTIFICATION_EMAIL not configured');
            }
        } catch (adminEmailError) {
            console.error("Failed to send admin alert email (non-fatal):", adminEmailError)
        }

        revalidatePath('/admin/host-requests')

        return {
            success: true,
            referenceNumber
        }

    } catch (error) {
        console.error("Failed to submit host request:")
        return {
            success: false,
            message: "An internal error occurred. Please try again later."
        }
    }
}
