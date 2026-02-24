import { Resend } from 'resend'
import { logSystemEvent } from './system-log'

/**
 * Unified Email Utility
 * 
 * Configured for GMAIL via Nodemailer.
 * Falls back to console log simulation if credentials are missing.
 */

interface EmailPayload {
    to: string
    subject: string
    html: string
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

// Lazily initialised — do NOT instantiate at module load so the app
// doesn't crash when RESEND_API_KEY is missing (e.g. local dev).
let _resend: Resend | null = null
function getResend() {
    if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!)
    return _resend
}

export const EMAIL_STYLES = `
    body { font-family: 'Inter', sans-serif; color: #1e293b; line-height: 1.6; }
    h2 { color: #0f172a; margin-top: 0; }
    p { margin-bottom: 16px; }
    .btn { display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 500; }
    .info-box { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 20px 0; }
    .info-row { margin-bottom: 8px; display: flex; }
    .info-label { font-weight: 600; width: 100px; color: #64748b; }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
    blockquote { border-left: 4px solid #e2e8f0; padding-left: 16px; margin: 0; color: #475569; }
`

export function generateEmailHtml(title: string, content: string) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${title}</title>
    <style>${EMAIL_STYLES}</style>
</head>
<body style="margin: 0; padding: 24px; background-color: #f1f5f9;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 32px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        ${content}
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
            <p>© ${new Date().getFullYear()} Edumeetup. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `
}

import { checkRateLimit } from './rate-limit'

export async function sendEmail({ to, subject, html }: EmailPayload) {
    // 1. Rate Check (Max 10 emails per recipient per hour)
    const isAllowed = checkRateLimit(`email:${to}`, 10)
    if (!isAllowed) {
        console.warn(`[RATE LIMIT] Blocked email to ${to}`)
        await logSystemEvent({
            level: 'WARN',
            type: 'EMAIL_FAILURE',
            message: "Rate limit exceeded",
            metadata: { to, subject }
        })
        return { error: "Too many requests. Please try again later." }
    }

    // Fallback simulation if Resend API key is missing
    if (!process.env.RESEND_API_KEY) {
        console.log(`
    ==================================================
    [EMAIL SIMULATION - MISSING RESEND_API_KEY]
    To: ${to}
    Subject: ${subject}
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
            html
        })

        if (error) {
            throw new Error(error.message)
        }

        console.log(`[RESEND] Email sent to: ${to} | Subject: ${subject}`)

        await logSystemEvent({
            level: 'INFO',
            type: 'EMAIL_SENT',
            message: `Email sent to ${to}`,
            metadata: { to, subject }
        })

        return { success: true }
    } catch (error) {
        console.error("[RESEND] Failed to send email:", error)

        await logSystemEvent({
            level: 'ERROR',
            type: 'EMAIL_FAILURE',
            message: error instanceof Error ? error.message : "Unknown email error",
            metadata: { to, subject, error: JSON.stringify(error) }
        })

        return { error: "Failed to send email" }
    }
}

/**
 * HTML Templates
 */

export const EmailTemplates = {
    universityInterest: (studentName: string, studentEmail: string, message: string) => `
        <h2>New Student Interest!</h2>
        <p><strong>${studentName}</strong> has expressed interest in your university.</p>
        <p><strong>Contact Email:</strong> ${studentEmail}</p>
        <p><strong>Message:</strong></p>
        <blockquote>${message}</blockquote>
        <p>Log in to your dashboard to view more details.</p>
    `,

    verificationStatus: (status: 'VERIFIED' | 'REJECTED', institutionName: string) => `
        <h2>Verification Update for ${institutionName}</h2>
        <p>Your university profile has been <strong>${status}</strong>.</p>
        ${status === 'VERIFIED'
            ? '<p>You now have full access to student data and your profile is public.</p>'
            : '<p>Please contact support for more information regarding your application.</p>'
        }
    `,

    publicInquiryNotification: (inquiry: PublicInquiryData) => `
        <h2>New Public Inquiry</h2>
        <p><strong>From:</strong> ${inquiry.fullName} (${inquiry.role})</p>
        <p><strong>Email:</strong> ${inquiry.email}</p>
        <p><strong>Country:</strong> ${inquiry.country}</p>
        <p><strong>Subject:</strong> ${inquiry.subject}</p>
        <hr />
        <h3>Message:</h3>
        <p>${inquiry.message}</p>
        <hr />
        <p><strong>Phone:</strong> ${inquiry.phone || 'N/A'}</p>
        <p><strong>Organization:</strong> ${inquiry.orgName || 'N/A'}</p>
    `,

    publicInquiryAutoReply: (fullName: string) => `
        <h2>Thank you for contacting EduMeetup!</h2>
        <p>Dear ${fullName},</p>
        <p>We have received your inquiry and will get back to you within 24-48 hours.</p>
        <p>Best regards,<br/>The EduMeetup Team</p>
    `,

    supportTicketNotification: (ticket: SupportTicketData, userName: string, userEmail: string) => `
        <h2>New Support Ticket #${ticket.id.slice(-6)}</h2>
        <p><strong>User:</strong> ${userName} (${ticket.type})</p>
        <p><strong>Email:</strong> ${userEmail}</p>
        <p><strong>Category:</strong> ${ticket.category}</p>
        <p><strong>Priority:</strong> <span style="color: ${ticket.priority === 'HIGH' ? 'red' : 'black'}">${ticket.priority}</span></p>
        <hr />
        <h3>Message:</h3>
        <p>${ticket.message}</p>
    `,

    welcomeStudent: (fullName: string) => `
        <h2>Welcome to EduMeetup!</h2>
        <p>Dear ${fullName},</p>
        <p>Thank you for joining EduMeetup. Your profile has been created successfully.</p>
        <p>You can now:</p>
        <ul>
            <li>Browse universities and programs</li>
            <li>Express interest in programs</li>
            <li>Schedule meetings</li>
        </ul>
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/student/dashboard">Go to Dashboard</a></p>
    `,

    adminNewStudent: (fullName: string, email: string) => `
        <h2>New Student Registration</h2>
        <p><strong>Name:</strong> ${fullName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p>Check the admin dashboard for details.</p>
    `,

    adminNewUniversity: (instName: string, email: string) => `
        <h2>New University Registration</h2>
        <p><strong>Institution:</strong> ${instName}</p>
        <p><strong>Contact:</strong> ${email}</p>
        <p><strong>Status:</strong> Pending Verification</p>
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/admin/dashboard">Review Now</a></p>
    `,

    otpVerification: (otp: string) => `
        <h2>Verify Your Email</h2>
        <p>Thank you for registering with EduMeetup. Please use the following One-Time Password (OTP) to verify your email address:</p>
        <h1 style="font-size: 32px; letter-spacing: 5px; color: #4F46E5;">${otp}</h1>
        <p>This code will expire in 15 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
    `,

    hostRequestConfirmation: (refNumber: string, contactName: string) => `
        <h2>Campus Fair Request Received</h2>
        <p>Dear ${contactName},</p>
        <p>Thank you for your interest in hosting a campus fair through edUmeetup.</p>
        <div class="info-box">
            <p><strong>Reference Number:</strong> ${refNumber}</p>
            <p>Your request is currently under review. Expected review time: 48 hours.</p>
        </div>
        <p>We will contact you regarding the next steps once verified.</p>
    `,

    hostRequestAlert: (refNumber: string, institution: string, city: string) => `
        <h2>New Campus Fair Request</h2>
        <div class="info-box">
            <div class="info-row"><span class="info-label">Institution:</span> <span>${institution}</span></div>
            <div class="info-row"><span class="info-label">Location:</span> <span>${city}</span></div>
            <div class="info-row"><span class="info-label">Reference:</span> <span>${refNumber}</span></div>
        </div>
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/admin/host-requests" class="btn">Review Request</a></p>
    `,

    hostRequestApproved: (refNumber: string, contactName: string) => `
        <h2>Request Approved!</h2>
        <p>Dear ${contactName},</p>
        <p>We are pleased to inform you that your request to host a campus fair (Ref: ${refNumber}) has been <strong>approved</strong>.</p>
        <p>Our team is now initiating outreach to our partner universities.</p>
        <p>You will receive updates as universities express interest.</p>
    `,

    hostRequestOpportunity: (institutionName: string, city: string, dateRange: string) => `
        <h2>New Campus Fair Opportunity</h2>
        <p><strong>${institutionName}</strong> in <strong>${city}</strong> is hosting a specific recruitment fair.</p>
        <div class="info-box">
             <div class="info-row"><span class="info-label">Institution:</span> <span>${institutionName}</span></div>
             <div class="info-row"><span class="info-label">Location:</span> <span>${city}</span></div>
             <div class="info-row"><span class="info-label">Dates:</span> <span>${dateRange}</span></div>
        </div>
        <p>Log in to your dashboard to express interest.</p>
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/university/campus-fairs" class="btn">View Opportunity</a></p>
    `,

    adminNotification: (institution: string, location: string, refNumber: string, contact: string, email: string) => `
        <h2>New Campus Fair Request</h2>
        <p>A new request has been submitted.</p>
        <div class="info-box">
             <div class="info-row"><span class="info-label">Institution:</span> <span>${institution}</span></div>
             <div class="info-row"><span class="info-label">Location:</span> <span>${location}</span></div>
             <div class="info-row"><span class="info-label">Reference:</span> <span>${refNumber}</span></div>
             <div class="info-row"><span class="info-label">Contact:</span> <span>${contact} (${email})</span></div>
        </div>
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/admin/host-requests" class="btn">Review in Admin Dashboard</a></p>
    `,

    universityResponse: (universityName: string, institutionName: string, refNumber: string, status: 'INTERESTED' | 'NOT_INTERESTED', note?: string) => `
        <h2>University Response Received</h2>
        <p><strong>${universityName}</strong> has responded to the campus fair request from <strong>${institutionName}</strong>.</p>
        <div class="info-box">
            <div class="info-row"><span class="info-label">Reference:</span> <span>${refNumber}</span></div>
            <div class="info-row"><span class="info-label">Response:</span> <span style="font-weight:bold; color:${status === 'INTERESTED' ? 'green' : 'red'}">${status}</span></div>
            ${note ? `<div class="info-row"><span class="info-label">Note:</span> <span>${note}</span></div>` : ''}
        </div>
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/admin/host-requests" class="btn">View Details</a></p>
    `
}
