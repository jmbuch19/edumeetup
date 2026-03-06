'use server'

import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { sendEmail, generateEmailHtml } from '@/lib/email'

export async function sendSupportMessage(prevState: any, formData: FormData) {
    const user = await requireUser()
    if (user.role !== 'STUDENT') return { error: 'Only students can send messages.' }

    const category = formData.get('category') as string
    const message = formData.get('message') as string

    if (!category || !message?.trim()) {
        return { error: 'Please fill in all fields.' }
    }

    if (message.length > 2000) {
        return { error: 'Message is too long (max 2000 characters).' }
    }

    try {
        await prisma.supportTicket.create({
            data: {
                userId: user.id,
                type: 'STUDENT',
                category,
                priority: 'MEDIUM',
                message: message.trim(),
                status: 'NEW',
            }
        })

        // Notify admin (fire-and-forget)
        const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL
        if (adminEmail) {
            void sendEmail({
                to: adminEmail,
                subject: `[Student Support] ${category} — ${user.email}`,
                html: generateEmailHtml('New Student Support Message', `
                    <p><strong>From:</strong> ${user.email}</p>
                    <p><strong>Category:</strong> ${category}</p>
                    <p><strong>Message:</strong></p>
                    <p style="background:#f5f5f5;padding:12px;border-radius:6px;">${message.replace(/\n/g, '<br>')}</p>
                    <p><a href="https://edumeetup.com/admin/dashboard">View in Admin Panel →</a></p>
                `)
            }).catch(() => null)
        }

        revalidatePath('/student/messages')
        return { success: true, message: 'Your message has been sent! We\'ll get back to you within 24 hours.' }

    } catch (error) {
        console.error('[sendSupportMessage] failed:', error)
        return { error: 'Failed to send message. Please try again.' }
    }
}
