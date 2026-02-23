'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { logAudit } from "@/lib/audit"
import { requireUser } from "@/lib/auth"
import { sendEmail, EmailTemplates, generateEmailHtml } from "@/lib/email"

export type RespondOption = "INTERESTED" | "NOT_INTERESTED"

export async function respondToOutreach(outreachId: string, status: RespondOption, note?: string) {
    try {
        const user = await requireUser()

        // precise permissions check: ensure this outreach belongs to the user's university
        if ((user.role !== "UNIVERSITY" && user.role !== "UNIVERSITY_REP")) {
            return { success: false, message: "Unauthorized" }
        }

        const uni = await prisma.university.findUnique({
            where: { userId: user.id }
        })

        if (!uni) {
            return { success: false, message: "University profile not found" }
        }

        const outreach = await prisma.hostRequestOutreach.findUnique({
            where: { id: outreachId },
            include: {
                hostRequest: true,
                university: true
            }
        })

        if (!outreach) {
            return { success: false, message: "Outreach request not found" }
        }

        if (outreach.universityId !== uni.id) {
            return { success: false, message: "Unauthorized access to this request" }
        }

        // Update Status
        const updated = await prisma.hostRequestOutreach.update({
            where: { id: outreachId },
            data: {
                status,
                responseNote: note,
                respondedAt: new Date()
            },
            include: { hostRequest: true }
        })

        // Log Audit
        await logAudit({
            action: "RESPOND_TO_OUTREACH",
            entityType: "HostRequestOutreach",
            entityId: outreachId,
            actorId: user.id,
            metadata: {
                status,
                hostRequestId: outreach.hostRequestId,
                hostRequestRef: outreach.hostRequest.referenceNumber,
                universityId: uni.id
            }
        })

        // Notify Admin if Interested
        if (status === "INTERESTED") {
            const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL
            if (!ADMIN_EMAIL) throw new Error('ADMIN_NOTIFICATION_EMAIL not configured')
            await sendEmail({
                to: ADMIN_EMAIL,
                subject: `Uni Response: ${user.name || outreach.university.institutionName} is INTERESTED in Fair ${outreach.hostRequest.referenceNumber}`,
                html: generateEmailHtml(
                    "University Interest Confirmed",
                    `<p><strong>${outreach.university.institutionName}</strong> has expressed interest in hosting a fair.</p>
                     <p><strong>Fair Reference:</strong> ${outreach.hostRequest.referenceNumber}</p>
                     <p><strong>Institution:</strong> ${outreach.hostRequest.institutionName} (${outreach.hostRequest.city})</p>
                     <p><strong>Note:</strong> ${note || "No additional notes."}</p>
                     <br/>
                     <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/host-requests/${outreach.hostRequestId}" style="background:#0F172A;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">View Request</a>`
                )
            })
        }

        revalidatePath('/university/dashboard/fairs')
        return { success: true }

    } catch (error) {
        console.error("Failed to respond to outreach:", error)
        return { success: false, message: "Internal server error" }
    }
}
