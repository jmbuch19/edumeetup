'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { createNotification } from '@/lib/notifications'
import { EmailTemplates } from '@/lib/email'

export async function verifyUniversity(formData: FormData) {
    const universityId = formData.get('universityId') as string
    const action = formData.get('action') as string

    if (!universityId || !action) return { error: "Missing fields" }

    const user = await requireRole('ADMIN')

    const status = action === 'approve' ? 'VERIFIED' : 'REJECTED'

    try {
        const uniProfile = await prisma.universityProfile.findUnique({
            where: { id: universityId },
            include: { user: true }
        })

        if (!uniProfile) return { error: "University not found" }

        const uni = await prisma.universityProfile.update({
            where: { id: universityId },
            data: {
                verificationStatus: status,
                verifiedDate: status === 'VERIFIED' ? new Date() : null,
                user: {
                    update: {
                        status: status === 'VERIFIED' ? 'ACTIVE' : 'SUSPENDED'
                    }
                }
            },
            include: { user: true }
        })

        // Notification (Email + In-App)
        await createNotification({
            userId: uniProfile.userId, // Notify the University User
            type: 'VERIFICATION_UPDATE',
            title: `University Verification: ${status}`,
            message: status === 'VERIFIED'
                ? "Congratulations! Your university profile has been verified. You can now publish programs and accept meetings."
                : "Your university verification was rejected. Please contact support for more details.",
            emailTo: uni.contactEmail || uniProfile.user.email,
            emailSubject: `University Verification Update: ${uni.verificationStatus}`,
            emailHtml: EmailTemplates.verificationStatus(
                uni.verificationStatus as 'VERIFIED' | 'REJECTED',
                uni.institutionName
            )
        })

        await logAudit({
            action: status === 'VERIFIED' ? 'VERIFY_UNIVERSITY' : 'REJECT_UNIVERSITY',
            entityType: 'UNIVERSITY',
            entityId: universityId,
            actorId: user.id,
            metadata: { status }
        })

        revalidatePath('/admin/dashboard')
    } catch (error) {
        console.error("Failed to verify university:", error)
        return { error: "Failed to verify" }
    }
}
