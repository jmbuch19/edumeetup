'use server'

import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { sendEmail, generateEmailHtml } from '@/lib/email'

const SUPPORT_DAILY_LIMIT = 10
const SUPPORT_ANNUAL_LIMIT = 200

/** Returns support message quota for the logged-in student */
export async function getSupportQuota() {
    const user = await requireUser()
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    const [daily, annual] = await Promise.all([
        prisma.supportTicket.count({
            where: { userId: user.id, createdAt: { gte: startOfDay } },
        }),
        prisma.supportTicket.count({
            where: { userId: user.id, createdAt: { gte: startOfYear } },
        }),
    ])
    return { daily, annual, dailyLimit: SUPPORT_DAILY_LIMIT, annualLimit: SUPPORT_ANNUAL_LIMIT }
}

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

    // ── Quota check (support-only, separate from university quota) ──
    const quota = await getSupportQuota()
    if (quota.daily >= SUPPORT_DAILY_LIMIT) {
        return { error: `Daily limit of ${SUPPORT_DAILY_LIMIT} support messages reached. Try again tomorrow.` }
    }
    if (quota.annual >= SUPPORT_ANNUAL_LIMIT) {
        return { error: `Annual limit of ${SUPPORT_ANNUAL_LIMIT} support messages reached.` }
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
        return {
            success: true,
            message: 'Your message has been sent! We\'ll get back to you within 24 hours.',
            quota: { daily: quota.daily + 1, annual: quota.annual + 1, dailyLimit: SUPPORT_DAILY_LIMIT, annualLimit: SUPPORT_ANNUAL_LIMIT }
        }

    } catch (error) {
        console.error('[sendSupportMessage] failed:', error)
        return { error: 'Failed to send message. Please try again.' }
    }
}
