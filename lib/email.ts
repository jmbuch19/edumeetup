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
