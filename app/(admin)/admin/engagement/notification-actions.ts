'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { sendMarketingEmail, generateEmailHtml, EmailTemplates } from "@/lib/email"

const ALLOWED_NOTIFICATION_TYPES = ['INFO', 'WARNING', 'ACTION_REQUIRED'] as const

export async function sendNotification(formData: FormData) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") return { error: "Unauthorized" }

    const recipientEmail = formData.get("recipientEmail") as string
    const title = formData.get("title") as string
    const message = formData.get("message") as string
    const actionUrl = (formData.get("actionUrl") as string)?.trim() || undefined
    const notifType = (formData.get("notifType") as string) || "INFO"

    if (!recipientEmail || !title || !message) return { error: "Missing fields" }

    // Security: reject external URLs to prevent open redirect / phishing
    if (actionUrl && !actionUrl.startsWith('/')) {
        return { error: "Action URL must be an internal path starting with /" }
    }

    // Validate notification type
    if (!ALLOWED_NOTIFICATION_TYPES.includes(notifType as any)) {
        return { error: "Invalid notification type" }
    }

    try {
        // Find user and auto-detect role
        const user = await prisma.user.findUnique({
            where: { email: recipientEmail },
            include: { student: true, university: true }
        })

        if (!user) return { error: "No user found with that email" }

        const hasStudent = !!user.student
        const hasUniversity = !!user.university

        // Guard against ambiguous or profileless users
        if (hasStudent && hasUniversity) {
            return { error: "Ambiguous user — contact developer" }
        }
        if (!hasStudent && !hasUniversity) {
            return { error: "User has no student or university profile" }
        }

        // Write in-app notification
        if (hasStudent) {
            await prisma.studentNotification.create({
                data: {
                    studentId: user.student!.id,
                    title,
                    message,
                    type: notifType,
                    actionUrl: actionUrl ?? null,
                }
            })
        } else {
            await prisma.universityNotification.create({
                data: {
                    universityId: user.university!.id,
                    title,
                    message,
                    type: notifType,
                    actionUrl: actionUrl ?? null,
                }
            })
        }

        // Also send a transactional email
        await sendMarketingEmail({
            userEmail: user.email,
            to: user.email,
            subject: `[edUmeetup] ${title}`,
            html: generateEmailHtml(title, EmailTemplates.announcement(title, message))
        })

        return { success: true }
    } catch (error) {
        console.error("[sendNotification]", error)
        return { error: "Failed to send notification" }
    }
}
