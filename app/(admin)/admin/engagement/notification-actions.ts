'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { sendEmail, sendMarketingEmail, generateEmailHtml, EmailTemplates } from "@/lib/email"

export async function sendNotification(formData: FormData) {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") return { error: "Unauthorized" }

    const recipientEmail = formData.get("recipientEmail") as string
    const title = formData.get("title") as string
    const message = formData.get("message") as string
    const targetType = formData.get("targetType") as string // STUDENT, UNIVERSITY

    if (!recipientEmail || !title || !message) return { error: "Missing fields" }

    try {
        // Find the user first
        const user = await prisma.user.findUnique({
            where: { email: recipientEmail },
            include: { student: true, university: true }
        })

        if (!user) return { error: "User not found" }

        if (targetType === "STUDENT") {
            if (!user.student) return { error: "User is not a student" }
            await prisma.studentNotification.create({
                data: {
                    studentId: user.student.id,
                    title,
                    message,
                    type: "INFO"
                }
            })
        } else if (targetType === "UNIVERSITY") {
            if (!user.university) return { error: "User is not a university" }
            await prisma.universityNotification.create({
                data: {
                    universityId: user.university.id,
                    title,
                    message,
                    type: "INFO"
                }
            })
        } else {
            return { error: "Invalid target type" }
        }

        // Respects consentMarketing (notifications are marketing communications)
        await sendMarketingEmail({
            userEmail: user.email,
            to: user.email,
            subject: `[edUmeetup] ${title}`,
            html: generateEmailHtml(title, EmailTemplates.announcement(title, message))
        })

        return { success: true }
    } catch (error) {
        return { error: "Failed to send notification" }
    }
}
