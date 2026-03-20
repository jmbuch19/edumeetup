'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { sendEmail, generateEmailHtml, EmailTemplates } from "@/lib/email"
import { validateFileSignature } from "@/lib/file-signature"

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024 // 5 MB

const ALLOWED_NOTIFICATION_TYPES = ['INFO', 'WARNING', 'ACTION_REQUIRED'] as const

export async function sendNotification(formData: FormData) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") return { error: "Unauthorized" }

    const recipientEmail = formData.get("recipientEmail") as string
    const title = formData.get("title") as string
    const message = formData.get("message") as string
    const actionUrl = (formData.get("actionUrl") as string)?.trim() || undefined
    const notifType = (formData.get("notifType") as string) || "INFO"
    const attachmentFile = formData.get("attachment") as File | null

    if (!recipientEmail || !title || !message) return { error: "Missing fields" }

    // Parse and validate optional attachment
    let attachment: { filename: string; content: Buffer } | undefined
    if (attachmentFile && attachmentFile.size > 0) {
        if (attachmentFile.size > MAX_ATTACHMENT_BYTES) {
            return { error: `Attachment too large (max 5 MB)` }
        }
        const buf = Buffer.from(await attachmentFile.arrayBuffer())
        if (!validateFileSignature(buf, attachmentFile.type)) {
            return { error: 'Attachment content does not match declared type' }
        }
        attachment = { filename: attachmentFile.name, content: buf }
    }

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

        // Always send transactional email for targeted admin push
        await sendEmail({
            to: user.email,
            subject: `[EdUmeetup] ${title}`,
            html: generateEmailHtml(title, EmailTemplates.announcement(title, message)),
            ...(attachment ? { attachments: [attachment] } : {})
        })

        return { success: true }
    } catch (error) {
        console.error("[sendNotification]")
        return { error: "Failed to send notification" }
    }
}
