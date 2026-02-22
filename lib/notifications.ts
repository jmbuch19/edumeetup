import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

export interface NotificationPayload {
    userId: string
    type: string
    title: string
    message: string
    payload?: any
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
                payload: data.payload || {}
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

export async function createNotifications(dataList: NotificationPayload[]) {
    try {
        // 1. DB Notifications (Batch)
        if (dataList.length > 0) {
            await prisma.notification.createMany({
                data: dataList.map(d => ({
                    userId: d.userId,
                    type: d.type,
                    title: d.title,
                    message: d.message,
                    payload: d.payload || {}
                }))
            })
        }

        // 2. Email Notifications (Parallel)
        // Filter those that need email
        const emailsToSend = dataList.filter(d => d.emailTo && d.emailSubject && d.emailHtml)

        if (emailsToSend.length > 0) {
            const emailPromises = emailsToSend.map(d => sendEmail({
                to: d.emailTo!,
                subject: d.emailSubject!,
                html: d.emailHtml!
            }))

            // Use allSettled to ensure all emails are attempted even if one fails (though sendEmail catches errors)
            await Promise.allSettled(emailPromises)
        }
    } catch (error) {
        console.error("Failed to batch create notifications:", error)
        // Don't throw, log error.
    }
}
