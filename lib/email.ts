import nodemailer from 'nodemailer'

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

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
})

export async function sendEmail({ to, subject, html }: EmailPayload) {
    // Fallback to simulation if credentials are missing
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.log(`
    ==================================================
    [EMAIL SIMULATION - MISSING CREDS]
    To: ${to}
    Subject: ${subject}
    --------------------------------------------------
    ${html}
    ==================================================
        `)
        return { success: true }
    }

    try {
        await transporter.sendMail({
            from: `"EduMeetup" <${process.env.GMAIL_USER}>`,
            to,
            subject,
            html
        })
        console.log(`[EMAIL SENT] To: ${to} | Subject: ${subject}`)
        return { success: true }
    } catch (error) {
        console.error("Failed to send email:", error)
        // Fallback to simulation on error so flow doesn't break
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

    publicInquiryNotification: (inquiry: any) => `
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

    supportTicketNotification: (ticket: any, userName: string, userEmail: string) => `
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
    `
}
