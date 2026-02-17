import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const user = process.env.GMAIL_USER
        const pass = process.env.GMAIL_APP_PASSWORD

        if (!user || !pass) {
            return NextResponse.json({
                error: "Missing Credentials",
                details: {
                    GMAIL_USER: user ? "Set" : "Missing",
                    GMAIL_APP_PASSWORD: pass ? "Set" : "Missing"
                }
            }, { status: 500 })
        }

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: { user, pass },
            connectionTimeout: 10000,
            greetingTimeout: 5000,
            socketTimeout: 10000,
            debug: true, // Show debug output
            logger: true // Log to console
        })

        // 1. Verify Connection
        console.log("Verifying connection...")
        await transporter.verify()
        console.log("Connection verified!")

        // 2. Send Test Email
        console.log("Sending test email...")
        const info = await transporter.sendMail({
            from: `"Test Tool" <${user}>`,
            to: user, // Send to self
            subject: "EduMeetup Production Email Test",
            text: "If you are reading this, your email configuration is CORRECT!",
            html: "<h1>Success!</h1><p>Your email configuration is working correctly.</p>"
        })

        return NextResponse.json({
            success: true,
            message: "Email sent successfully",
            messageId: info.messageId,
            config: {
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                user: user
            }
        })

    } catch (error: any) {
        console.error("Diagnostic Error:", error)
        return NextResponse.json({
            success: false,
            error: error.message,
            code: error.code,
            command: error.command,
            response: error.response,
            stack: error.stack
        }, { status: 500 })
    }
}
