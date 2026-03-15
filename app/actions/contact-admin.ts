'use server'

import { auth } from '@/lib/auth'
import { sendEmail, generateEmailHtml } from '@/lib/email'
import { contactRateLimiter } from '@/lib/ratelimit'

export interface ContactAdminPayload {
    subject: string
    message: string
    senderName: string
    senderEmail: string
    senderOrg: string
    portalType: 'University' | 'Student'
}

export async function sendContactAdminMessage(payload: ContactAdminPayload) {
    // ── Auth guard — only logged-in users ────────────────────────────────────
    const session = await auth()
    if (!session?.user) return { error: 'You must be logged in to contact support.' }

    // ── Rate limit — 3 messages per minute per sender email ──────────────────
    if (!contactRateLimiter.check(payload.senderEmail)) {
        return { error: '⏱ Too many messages. Please wait a minute before sending again.' }
    }

    const { subject, message, senderName, senderEmail, senderOrg, portalType } = payload

    if (!message?.trim()) return { error: 'Message is required' }
    if (message.trim().length < 10) return { error: 'Message is too short' }
    if (message.trim().length > 2000) return { error: 'Message must be under 2000 characters' }

    const timestamp = new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
    })

    const content = `
        <p>A new support message has been submitted via the <strong>${portalType} Portal</strong>.</p>
        <div class="info-box">
            <div class="info-row"><span class="info-label">From:</span> ${senderName}</div>
            <div class="info-row"><span class="info-label">Email:</span> <a href="mailto:${senderEmail}">${senderEmail}</a></div>
            <div class="info-row"><span class="info-label">Organisation:</span> ${senderOrg}</div>
            <div class="info-row"><span class="info-label">Portal:</span> ${portalType}</div>
            <div class="info-row"><span class="info-label">Subject:</span> ${subject}</div>
            <div class="info-row"><span class="info-label">Sent at:</span> ${timestamp} IST</div>
        </div>
        <h3 style="margin:20px 0 8px;">Message</h3>
        <blockquote style="border-left:4px solid #0d9488;padding-left:16px;margin:0;color:#1e293b;white-space:pre-wrap;">${message.trim()}</blockquote>
        <p style="margin-top:24px;">
            <a href="mailto:${senderEmail}" class="btn">Reply to ${senderName} →</a>
        </p>
    `

    return sendEmail({
        to: 'jaydeep@edumeetup.com',
        subject: `[${portalType} Help] ${subject} — ${senderOrg}`,
        html: generateEmailHtml(`Dashboard Help Request`, content),
        replyTo: senderEmail,
    })
}
