import { Resend } from 'resend'
import { logSystemEvent } from './system-log'

/**
 * Unified Email Utility
 *
 * Uses Resend for delivery.
 * Automatically generates plain-text fallback from HTML.
 * Falls back to console simulation if RESEND_API_KEY is missing.
 */

interface EmailPayload {
    to: string
    subject: string
    html: string
    replyTo?: string          // ← NEW
    text?: string             // optional override; auto-generated if omitted
}

interface PublicInquiryData {
    fullName: string
    role: string
    email: string
    country: string
    subject: string
    message: string
    phone?: string
    orgName?: string
}

interface SupportTicketData {
    id: string
    type: string
    category: string
    priority: string
    message: string
}

// ─── Resend client (lazy init) ──────────────────────────────────────────────
let _resend: Resend | null = null
function getResend() {
    if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!)
    return _resend
}

// ─── Email styles (used by layout wrapper) ──────────────────────────────────
export const EMAIL_STYLES = `
    body { font-family: 'Inter', Arial, sans-serif; color: #1e293b; line-height: 1.6; margin: 0; padding: 0; }
    h1, h2 { color: #0f172a; margin-top: 0; }
    p { margin-bottom: 16px; }
    a { color: #3333CC; }
    .btn { display: inline-block; background-color: #3333CC; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 8px 0; }
    .info-box { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 20px 0; }
    .info-row { margin-bottom: 8px; }
    .info-label { font-weight: 600; color: #64748b; display: inline-block; min-width: 110px; }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
    blockquote { border-left: 4px solid #e2e8f0; padding-left: 16px; margin: 0; color: #475569; }
    @media only screen and (max-width: 600px) {
        .container { padding: 16px !important; }
    }
`

// ─── Layout wrapper ──────────────────────────────────────────────────────────
export function generateEmailHtml(title: string, content: string) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>${EMAIL_STYLES}</style>
</head>
<body style="margin:0;padding:24px;background-color:#f1f5f9;">
    <!-- Header -->
    <div style="max-width:600px;margin:0 auto 0 auto;background-color:#3333CC;padding:24px 32px;border-radius:12px 12px 0 0;text-align:center;">
        <span style="font-size:22px;font-weight:800;color:white;letter-spacing:-0.5px;">edU<span style="color:#c7d2fe;">meetup</span></span>
        <p style="font-size:11px;color:#c7d2fe;margin:4px 0 0 0;letter-spacing:1px;text-transform:uppercase;">Where Dreams Meet Destinations</p>
    </div>
    <!-- Body -->
    <div class="container" style="max-width:600px;margin:0 auto;background-color:white;padding:32px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.07);">
        <h2 style="color:#3333CC;margin-top:0;">${title}</h2>
        ${content}
    </div>
    <!-- Footer -->
    <div style="max-width:600px;margin:0 auto;background-color:#f8fafc;padding:20px 32px;border-radius:0 0 12px 12px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;">
        <p style="margin:0 0 4px 0;">© ${new Date().getFullYear()} edUmeetup · IAES (International Academic &amp; Education Services)</p>
        <p style="margin:0;"><a href="https://www.edumeetup.com" style="color:#64748b;">www.edumeetup.com</a> · <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@edumeetup.com'}" style="color:#64748b;">Contact Support</a></p>
    </div>
</body>
</html>`
}

// ─── Strip HTML → plain text (for fallback) ──────────────────────────────────
function htmlToText(html: string): string {
    return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/?(p|div|li|h[1-6]|tr)[^>]*>/gi, '\n')
        .replace(/<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi, '$2 ($1)')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/&copy;/g, '©')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}

// ─── Rate limiter import ──────────────────────────────────────────────────────
import { checkRateLimit } from './ratelimit'

// ─── Marketing Email (consent-gated) ─────────────────────────────────────────
/**
 * Use this for newsletters, promotional outreach, announcements, etc.
 * Skips delivery if the recipient has withdrawn marketing consent.
 * Never use this for transactional emails (magic links, meeting reminders, support).
 */
export async function sendMarketingEmail(
    params: EmailPayload & { userEmail: string }
): Promise<{ skipped?: boolean; error?: string; success?: boolean }> {
    const { prisma: db } = await import('./prisma')
    const user = await db.user.findUnique({
        where: { email: params.userEmail },
        select: { consentMarketing: true }
    })

    if (!user?.consentMarketing) {
        console.log(`[EMAIL] Marketing email skipped (consent=false) → ${params.userEmail}`)
        await logSystemEvent({
            level: 'INFO',
            type: 'SYSTEM_EVENT',
            message: `Marketing email skipped (consent withdrawn) for ${params.userEmail}`,
            metadata: { to: params.userEmail, subject: params.subject }
        })
        return { skipped: true }
    }

    return sendEmail(params)
}


export async function sendEmail({ to, subject, html, replyTo, text }: EmailPayload) {
    // Rate limit: max 10 emails per recipient per hour
    const isAllowed = checkRateLimit(`email:${to}`, 10)
    if (!isAllowed) {
        console.warn(`[RATE LIMIT] Blocked email to ${to}`)
        await logSystemEvent({
            level: 'WARN',
            type: 'EMAIL_FAILURE',
            message: 'Rate limit exceeded',
            metadata: { to, subject }
        })
        return { error: 'Too many requests. Please try again later.' }
    }

    // Auto-generate plain-text fallback
    const plainText = text ?? htmlToText(html)

    // Simulate if Resend key is missing (local dev)
    if (!process.env.RESEND_API_KEY) {
        console.log(`
==================================================
[EMAIL SIMULATION - MISSING RESEND_API_KEY]
To: ${to}
Subject: ${subject}
${replyTo ? `Reply-To: ${replyTo}` : ''}
Plain Text Preview:
${plainText.slice(0, 300)}
==================================================
        `)
        return { success: true }
    }

    try {
        const fromAddress = process.env.EMAIL_FROM || 'EduMeetup <noreply@edumeetup.com>'

        const { error } = await getResend().emails.send({
            from: fromAddress,
            to,
            subject,
            html,
            text: plainText,
            ...(replyTo ? { replyTo } : {})
        })

        if (error) throw new Error((error as any).message)

        console.log(`[RESEND] Email sent → ${to} | ${subject}`)

        await logSystemEvent({
            level: 'INFO',
            type: 'EMAIL_SENT',
            message: `Email sent to ${to}`,
            metadata: { to, subject }
        })

        return { success: true }
    } catch (error) {
        console.error('[RESEND] Failed to send email:', error)

        await logSystemEvent({
            level: 'ERROR',
            type: 'EMAIL_FAILURE',
            message: error instanceof Error ? error.message : 'Unknown email error',
            metadata: { to, subject, error: JSON.stringify(error) }
        })

        return { error: 'Failed to send email' }
    }
}

// ─── Email Templates ──────────────────────────────────────────────────────────

export const EmailTemplates = {

    // ── Registration ─────────────────────────────────────────────────────────

    welcomeStudent: (fullName: string) => `
        <p>Hi ${fullName},</p>
        <p>Welcome to <strong>edUmeetup</strong>! Your account has been created successfully.</p>
        <p>You can now:</p>
        <ul style="padding-left:20px;color:#374151;">
            <li>Browse universities and programs from around the world</li>
            <li>Express interest in programs</li>
            <li>Book one-on-one meetings with university representatives</li>
            <li>Register for campus events</li>
        </ul>
        <p style="text-align:center;margin-top:24px;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'}/student/dashboard" class="btn">Go to My Dashboard →</a>
        </p>
        <p style="font-size:13px;color:#94a3b8;">If you didn't create this account, you can safely ignore this email.</p>
    `,

    adminNewStudent: (fullName: string, email: string) => `
        <p>A new student has registered on the platform.</p>
        <div class="info-box">
            <div class="info-row"><span class="info-label">Name:</span> ${fullName}</div>
            <div class="info-row"><span class="info-label">Email:</span> ${email}</div>
        </div>
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'}/admin/dashboard" class="btn">View in Admin Dashboard</a></p>
    `,

    adminNewUniversity: (instName: string, email: string) => `
        <p>A new university has registered and is awaiting verification.</p>
        <div class="info-box">
            <div class="info-row"><span class="info-label">Institution:</span> ${instName}</div>
            <div class="info-row"><span class="info-label">Contact:</span> ${email}</div>
            <div class="info-row"><span class="info-label">Status:</span> <span style="color:#d97706;font-weight:600;">Pending Verification</span></div>
        </div>
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'}/admin/dashboard" class="btn">Review &amp; Verify Now →</a></p>
    `,

    // ── Interest ──────────────────────────────────────────────────────────────

    universityInterest: (studentName: string, studentEmail: string, message: string) => `
        <p><strong>${studentName}</strong> has expressed interest in your university.</p>
        <div class="info-box">
            <div class="info-row"><span class="info-label">Student:</span> ${studentName}</div>
            <div class="info-row"><span class="info-label">Email:</span> <a href="mailto:${studentEmail}">${studentEmail}</a></div>
        </div>
        <p><strong>Message:</strong></p>
        <blockquote>${message}</blockquote>
        <p style="margin-top:20px;">You can reply directly to this email to contact the student, or view their full profile on the dashboard.</p>
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'}/university/dashboard" class="btn">View Dashboard →</a></p>
    `,

    // ── Verification ─────────────────────────────────────────────────────────

    verificationStatus: (status: 'VERIFIED' | 'REJECTED', institutionName: string) => status === 'VERIFIED'
        ? `
            <p>Great news, <strong>${institutionName}</strong>!</p>
            <p>Your university profile has been <span style="color:#16a34a;font-weight:700;">verified</span> by the EduMeetup team.</p>
            <p>You now have full access to:</p>
            <ul style="padding-left:20px;color:#374151;">
                <li>View interested students and their profiles</li>
                <li>Publish and manage your programs</li>
                <li>Accept and manage meeting requests</li>
                <li>Register for campus fair opportunities</li>
            </ul>
            <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'}/university/dashboard" class="btn">Go to Dashboard →</a></p>
        `
        : `
            <p>Dear ${institutionName},</p>
            <p>Thank you for registering with edUmeetup. After careful review, we were unable to verify your university profile at this time.</p>
            <p>This may be due to:</p>
            <ul style="padding-left:20px;color:#374151;">
                <li>Incomplete or unverifiable accreditation details</li>
                <li>Mismatched institutional information</li>
                <li>Domain verification issues</li>
            </ul>
            <p>Please contact our support team to resolve this and resubmit your application.</p>
            <p><a href="mailto:${process.env.SUPPORT_EMAIL || 'support@edumeetup.com'}" class="btn">Contact Support</a></p>
        `,

    // ── Meetings ─────────────────────────────────────────────────────────────

    meetingReminder: (title: string, timeStr: string, durationMinutes: number, joinUrl?: string, meetingCode?: string) => `
        <p>This is a reminder about your upcoming meeting.</p>
        <div class="info-box">
            <div class="info-row"><span class="info-label">Meeting:</span> ${title}</div>
            <div class="info-row"><span class="info-label">Time:</span> ${timeStr}</div>
            <div class="info-row"><span class="info-label">Duration:</span> ${durationMinutes} minutes</div>
            ${meetingCode ? `<div class="info-row"><span class="info-label">Code:</span> ${meetingCode}</div>` : ''}
        </div>
        ${joinUrl ? `<p style="text-align:center;"><a href="${joinUrl}" class="btn">Join Meeting →</a></p>` : ''}
        <p style="font-size:13px;color:#94a3b8;">If you need to cancel, please do so via your dashboard as soon as possible.</p>
    `,

    meetingUpdated: (title: string, timeStr: string, joinUrl?: string) => `
        <p>The details for your upcoming meeting have been updated.</p>
        <div class="info-box">
            <div class="info-row"><span class="info-label">Meeting:</span> ${title}</div>
            <div class="info-row"><span class="info-label">Time:</span> ${timeStr}</div>
            ${joinUrl ? `<div class="info-row"><span class="info-label">Join Link:</span> <a href="${joinUrl}">${joinUrl}</a></div>` : ''}
        </div>
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'}/student/dashboard?tab=meetings" class="btn">View Meeting →</a></p>
    `,

    studentCancelledMeeting: (meetingTitle: string, timeStr: string, reason: string) => `
        <p>A student has cancelled their meeting with you.</p>
        <div class="info-box">
            <div class="info-row"><span class="info-label">Meeting:</span> ${meetingTitle}</div>
            <div class="info-row"><span class="info-label">Was scheduled:</span> ${timeStr}</div>
            <div class="info-row"><span class="info-label">Reason:</span> ${reason || 'Not specified'}</div>
        </div>
        <p>The time slot has been freed and is available for other bookings.</p>
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'}/university/meetings" class="btn">View Meetings →</a></p>
    `,

    // ── Events ────────────────────────────────────────────────────────────────

    eventRegistration: (eventTitle: string, dateStr: string, location: string, universityName: string) => `
        <p>You're all set! Your registration has been confirmed.</p>
        <div class="info-box">
            <div class="info-row"><span class="info-label">Event:</span> ${eventTitle}</div>
            <div class="info-row"><span class="info-label">Date:</span> ${dateStr}</div>
            <div class="info-row"><span class="info-label">Location:</span> ${location || 'Online'}</div>
            <div class="info-row"><span class="info-label">Hosted by:</span> ${universityName}</div>
        </div>
        <p>We'll send you a reminder closer to the event date. Add it to your calendar so you don't miss it!</p>
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'}/student/dashboard" class="btn">View My Events →</a></p>
    `,

    // ── Support ───────────────────────────────────────────────────────────────

    supportTicketReceived: (ticketId: string, category: string, priority: string, userName: string) => `
        <p>Hi ${userName},</p>
        <p>We have received your support request and our team will review it shortly.</p>
        <div class="info-box">
            <div class="info-row"><span class="info-label">Ticket #:</span> ${ticketId.slice(-6).toUpperCase()}</div>
            <div class="info-row"><span class="info-label">Category:</span> ${category}</div>
            <div class="info-row"><span class="info-label">Priority:</span> ${priority}</div>
        </div>
        <p>Our team typically responds within <strong>24–48 hours</strong>. You will receive an email when your ticket is updated.</p>
        <p>In the meantime, you can reply to this email if you have additional information to add.</p>
    `,

    publicInquiryNotification: (inquiry: PublicInquiryData) => `
        <p><strong>From:</strong> ${inquiry.fullName} (${inquiry.role})</p>
        <p><strong>Email:</strong> ${inquiry.email}</p>
        <p><strong>Country:</strong> ${inquiry.country}</p>
        <p><strong>Subject:</strong> ${inquiry.subject}</p>
        <hr/>
        <h3>Message:</h3>
        <p>${inquiry.message}</p>
        <hr/>
        <p><strong>Phone:</strong> ${inquiry.phone || 'N/A'}</p>
        <p><strong>Organization:</strong> ${inquiry.orgName || 'N/A'}</p>
    `,

    publicInquiryAutoReply: (fullName: string) => `
        <p>Hi ${fullName},</p>
        <p>Thank you for reaching out to <strong>edUmeetup</strong>! We've received your inquiry and will get back to you within 24–48 hours.</p>
        <p>If your matter is urgent, you can also reach us at <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@edumeetup.com'}">${process.env.SUPPORT_EMAIL || 'support@edumeetup.com'}</a>.</p>
        <p>Best regards,<br/>The edUmeetup Team</p>
    `,

    supportTicketNotification: (ticket: SupportTicketData, userName: string, userEmail: string) => `
        <p><strong>User:</strong> ${userName} (${ticket.type})</p>
        <p><strong>Email:</strong> ${userEmail}</p>
        <p><strong>Category:</strong> ${ticket.category}</p>
        <p><strong>Priority:</strong> <span style="color:${ticket.priority === 'HIGH' ? '#dc2626' : '#374151'}">${ticket.priority}</span></p>
        <hr/>
        <h3>Message:</h3>
        <blockquote>${ticket.message}</blockquote>
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'}/admin/support" class="btn">View in Admin →</a></p>
    `,

    // ── Campus Fairs ──────────────────────────────────────────────────────────

    announcement: (title: string, content: string) => `
        <p>${content}</p>
        <hr/>
        <p style="font-size:12px;color:#94a3b8;">This is an official announcement from the edUmeetup team. You received this because you have an active account.</p>
    `,

    hostRequestConfirmation: (refNumber: string, contactName: string) => `
        <p>Dear ${contactName},</p>
        <p>Thank you for your interest in hosting a campus fair through <strong>edUmeetup</strong>. We have received your request.</p>
        <div class="info-box">
            <div class="info-row"><span class="info-label">Reference:</span> <strong>${refNumber}</strong></div>
            <div class="info-row"><span class="info-label">Status:</span> Under Review</div>
            <div class="info-row"><span class="info-label">Review time:</span> 48 hours</div>
        </div>
        <p>We will contact you with next steps once your request has been reviewed by our team.</p>
        <p>Best regards,<br/>The edUmeetup Team</p>
    `,

    hostRequestAlert: (refNumber: string, institution: string, city: string) => `
        <p>A new campus fair request has been submitted and requires review.</p>
        <div class="info-box">
            <div class="info-row"><span class="info-label">Institution:</span> ${institution}</div>
            <div class="info-row"><span class="info-label">Location:</span> ${city}</div>
            <div class="info-row"><span class="info-label">Reference:</span> ${refNumber}</div>
        </div>
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'}/admin/host-requests" class="btn">Review Request →</a></p>
    `,

    hostRequestApproved: (refNumber: string, contactName: string) => `
        <p>Dear ${contactName},</p>
        <p>We are pleased to inform you that your campus fair request has been <span style="color:#16a34a;font-weight:700;">approved</span>!</p>
        <div class="info-box">
            <div class="info-row"><span class="info-label">Reference:</span> ${refNumber}</div>
            <div class="info-row"><span class="info-label">Status:</span> <span style="color:#16a34a;font-weight:600;">Approved</span></div>
        </div>
        <p>Our team is now reaching out to partner universities. You will receive updates as universities express interest in participating in your fair.</p>
        <p>Best regards,<br/>The edUmeetup Team</p>
    `,

    hostRequestRejected: (refNumber: string, contactName: string, reason?: string) => `
        <p>Dear ${contactName},</p>
        <p>Thank you for your interest in hosting a campus fair through edUmeetup.</p>
        <p>After careful review, we are unable to proceed with your request at this time.</p>
        <div class="info-box">
            <div class="info-row"><span class="info-label">Reference:</span> ${refNumber}</div>
            ${reason ? `<div class="info-row"><span class="info-label">Reason:</span> ${reason}</div>` : ''}
        </div>
        <p>If you have questions or would like to discuss further, please contact us at <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@edumeetup.com'}">${process.env.SUPPORT_EMAIL || 'support@edumeetup.com'}</a>.</p>
        <p>We hope to work with you in the future.<br/>The edUmeetup Team</p>
    `,

    hostRequestOpportunity: (institutionName: string, city: string, dateRange: string, outreachId?: string) => `
        <p><strong>${institutionName}</strong> in <strong>${city}</strong> is hosting a campus fair and is looking for international universities to participate.</p>
        <div class="info-box">
            <div class="info-row"><span class="info-label">Institution:</span> ${institutionName}</div>
            <div class="info-row"><span class="info-label">Location:</span> ${city}</div>
            <div class="info-row"><span class="info-label">Dates:</span> ${dateRange}</div>
        </div>
        <p>Interested in participating? Log in to your dashboard to express your interest — spots are limited.</p>
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'}/university/fairs${outreachId ? `?highlight=${outreachId}` : ''}" class="btn">View Opportunity &amp; Respond →</a></p>
    `,

    fairUpdateForHost: (universityName: string, response: 'INTERESTED' | 'NOT_INTERESTED', refNumber: string, note?: string) => `
        <p>We have an update on your campus fair request.</p>
        <div class="info-box">
            <div class="info-row"><span class="info-label">Reference:</span> ${refNumber}</div>
            <div class="info-row"><span class="info-label">University:</span> ${universityName}</div>
            <div class="info-row"><span class="info-label">Response:</span> <span style="font-weight:700;color:${response === 'INTERESTED' ? '#16a34a' : '#dc2626'}">${response === 'INTERESTED' ? '✅ Interested' : '❌ Not Interested'}</span></div>
            ${note ? `<div class="info-row"><span class="info-label">Note:</span> ${note}</div>` : ''}
        </div>
        <p>Our team will continue coordinating and keep you updated as more universities respond.</p>
    `,

    universityResponse: (universityName: string, institutionName: string, refNumber: string, status: 'INTERESTED' | 'NOT_INTERESTED', note?: string) => `
        <p><strong>${universityName}</strong> has responded to the campus fair request from <strong>${institutionName}</strong>.</p>
        <div class="info-box">
            <div class="info-row"><span class="info-label">Reference:</span> ${refNumber}</div>
            <div class="info-row"><span class="info-label">Response:</span> <span style="font-weight:700;color:${status === 'INTERESTED' ? '#16a34a' : '#dc2626'}">${status}</span></div>
            ${note ? `<div class="info-row"><span class="info-label">Note:</span> ${note}</div>` : ''}
        </div>
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'}/admin/host-requests" class="btn">View Details →</a></p>
    `,
}
