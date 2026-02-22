'use server'

import { prisma } from '@/lib/prisma'
import { sendEmail, EmailTemplates } from '@/lib/email'
import { contactRateLimiter, supportRateLimiter } from '@/lib/ratelimit'
import { headers } from 'next/headers'
import { publicInquirySchema, supportTicketSchema } from '@/lib/schemas'
import { requireUser } from '@/lib/auth'
import { createNotification } from '@/lib/notifications'

export async function submitPublicInquiry(formData: FormData) {
    const rawData = Object.fromEntries(formData.entries())

    // RATE LIMIT (IP Based)
    const ip = headers().get('x-forwarded-for') || 'unknown'
    if (!contactRateLimiter.check(ip)) {
        return { error: "Too many inquiries. Please try again later." }
    }

    const validation = publicInquirySchema.safeParse(rawData)

    if (!validation.success) {
        return { error: validation.error.flatten().fieldErrors }
    }

    const { fullName, email, subject, message, role, country, phone, orgName } = validation.data

    try {
        // Send email to Admin
        await sendEmail({
            to: process.env.INFO_EMAIL || 'info@edumeetup.com',
            subject: `[Public Inquiry] ${subject} — ${fullName} (${role})`,
            html: EmailTemplates.publicInquiryNotification({
                fullName,
                email,
                role,
                country,
                subject,
                message,
                phone,
                orgName
            })
        })

        // Auto-reply
        await sendEmail({
            to: email,
            subject: `We received your inquiry: ${subject}`,
            html: EmailTemplates.publicInquiryAutoReply(fullName)
        })

        return { success: true }
    } catch (error) {
        console.error("Failed to submit inquiry:", error)
        return { error: "Failed to submit inquiry" }
    }
}

export async function createSupportTicket(formData: FormData) {
    const user = await requireUser()

    // RATE LIMIT
    if (!supportRateLimiter.check(user.id)) {
        return { error: "Too many support tickets. Please wait a moment." }
    }

    const rawData = Object.fromEntries(formData.entries())
    const validation = supportTicketSchema.safeParse(rawData)

    if (!validation.success) {
        return { error: validation.error.flatten().fieldErrors }
    }

    const { category, priority, message } = validation.data

    if (!user) return { error: "Not logged in" }

    const sessionEmail = user.email

    try {
        const user = await prisma.user.findUnique({
            where: { email: sessionEmail },
            include: { studentProfile: true, universityProfile: true }
        })

        if (!user) return { error: "User not found" }

        const userName = user.studentProfile?.fullName || user.universityProfile?.institutionName || "Unknown User"

        // 1. Save to Database
        const ticket = await prisma.supportTicket.create({
            data: {
                userId: user.id,
                type: user.role === 'STUDENT' ? 'STUDENT' : 'UNIVERSITY',
                category,
                priority,
                message,
                status: 'NEW'
            }
        })

        // 2. Email to SUPPORT (Notification)
        await sendEmail({
            to: process.env.SUPPORT_EMAIL || 'support@edumeetup.com',
            subject: `[Support Ticket #${ticket.id.slice(-6)}] ${category} — ${userName} `,
            html: EmailTemplates.supportTicketNotification(ticket, userName, user.email)
        })

        // 3. Notify User (Confirmation)
        await createNotification({
            userId: user.id,
            type: 'TICKET_CREATED',
            title: 'Support Ticket Received',
            message: `We received your ticket #${ticket.id.slice(-6)}: "${category}". Our team will review it shortly.`,
            payload: { ticketId: ticket.id }
        })

        return { success: true, ticketId: ticket.id }
    } catch (error) {
        console.error("Failed to create ticket:", error)
        return { error: "Failed to create ticket" }
    }
}
