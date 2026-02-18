'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { sendEmail } from '@/lib/email'
import { z } from 'zod'

const bugReportSchema = z.object({
    type: z.enum(['BUG', 'FEEDBACK', 'UI_ISSUE']),
    message: z.string().min(5, "Message too short"),
    path: z.string().optional(),
    screenshotUrl: z.string().optional()
})

export async function submitBugReport(formData: FormData) {
    const rawData = Object.fromEntries(formData.entries())
    const validation = bugReportSchema.safeParse(rawData)

    if (!validation.success) {
        return { error: validation.error.flatten().fieldErrors }
    }

    const { type, message, path, screenshotUrl } = validation.data
    const session = await auth()
    const userId = session?.user?.id

    try {
        // 1. Save to DB
        const report = await prisma.systemReport.create({
            data: {
                type,
                message,
                userId,
                path,
                screenshotUrl
            }
        })

        // 2. Email Admin
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@edumeetup.com'
        await sendEmail({
            to: adminEmail,
            subject: `[URGENT] ${type} Reported on edumeetup.com`,
            html: `
                <h2>New System Report (#${report.id})</h2>
                <p><strong>Type:</strong> ${type}</p>
                <p><strong>User ID:</strong> ${userId || 'Anonymous'}</p>
                <p><strong>Path:</strong> ${path || 'N/A'}</p>
                <hr />
                <p><strong>Message:</strong></p>
                <blockquote>${message}</blockquote>
                ${screenshotUrl ? `<p><strong>Screenshot:</strong> <a href="${screenshotUrl}">View Image</a></p>` : ''}
            `
        })

        return { success: true }
    } catch (error) {
        console.error("Failed to submit bug report:", error)
        return { error: "Failed to submit report" }
    }
}
