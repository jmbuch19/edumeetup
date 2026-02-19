import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const customTo = searchParams.get('to')

        // Use the EXACT same variables as lib/auth.ts
        const host = process.env.EMAIL_SERVER_HOST
        const port = Number(process.env.EMAIL_SERVER_PORT)
        const user = process.env.EMAIL_SERVER_USER
        const pass = process.env.EMAIL_SERVER_PASSWORD
        const from = process.env.EMAIL_FROM || "noreply@edumeetup.com"

        // production logic check
        const isProduction = process.env.NODE_ENV === "production"
        // Force secure: true if port is 465, otherwise follow the same logic as auth.ts
        const secure = port === 465 || isProduction

        if (!user || !pass || !host) {
            return NextResponse.json({
                error: "Missing Configuration",
                debug: {
                    EMAIL_SERVER_HOST: host,
                    EMAIL_SERVER_PORT: port,
                    EMAIL_SERVER_USER: user ? "Set" : "Missing",
                    EMAIL_SERVER_PASSWORD: pass ? "Set" : "Missing",
                    EMAIL_FROM: from
                }
            }, { status: 500 })
        }

        const transporter = nodemailer.createTransport({
            host,
            port,
            secure,
            auth: { user, pass },
            debug: true,
            logger: true,
            connectionTimeout: 10000, // 10s
        })

        // 1. Verify
        console.log("Verifying connection...")
        await transporter.verify()

        // 2. Send
        const recipient = customTo || user
        console.log("Sending email to:", recipient)
        const info = await transporter.sendMail({
            from,
            to: recipient, // Send to the sender account itself to verify delivery
            subject: "EduMeetup DIAGNOSTIC Test",
            text: `This is a test email sent to ${recipient}. If you see this, SMTP is working.`,
            html: `<h1>Success!</h1><p>SMTP Check Passed for ${recipient}.</p>`
        })

        return NextResponse.json({
            success: true,
            message: "Email sent successfully!",
            details: {
                messageId: info.messageId,
                response: info.response,
                config: { host, port, secure, user }
            }
        })

    } catch (error: any) {
        console.error("Test Email Error:", error)
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack,
            code: error.code,
            command: error.command
        }, { status: 500 })
    }
}
