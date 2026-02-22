import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { Prisma } from '@prisma/client'

interface NotificationPayload {
    userId: string
    type: string
    title: string
    message: string
    payload?: Prisma.InputJsonValue
    emailTo?: string
    emailSubject?: string
    emailHtml?: string
}

export async function createNotification(data: NotificationPayload) {
    try {
        // 1. DB Notification
        await prisma.notification.create({
            data: {
                userId: data.userId,
                type: data.type,
                title: data.title,
                message: data.message,
                payload: data.payload ?? {}
            }
        })

        // 2. Email Notification (Optional)
        if (data.emailTo && data.emailSubject && data.emailHtml) {
            await sendEmail({
                to: data.emailTo,
                subject: data.emailSubject,
                html: data.emailHtml
            })
        }
    } catch (error) {
        console.error(`Failed to send notification (${data.type}):`, error)
        // Don't throw, just log. Notifications shouldn't break the main flow.
    }
}
