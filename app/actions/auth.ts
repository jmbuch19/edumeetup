'use server'

import { prisma } from '@/lib/prisma'
import { sendEmail, EmailTemplates } from '@/lib/email'
import { randomBytes, createHash } from 'crypto'
import bcrypt from 'bcryptjs'

export async function forgotPassword(formData: FormData) {
    const email = formData.get('email') as string

    if (!email) {
        return { error: "Email is required" }
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email }
        })

        if (!user) {
            // Security: Don't reveal if user exists
            return { success: true, message: "If an account exists, a reset link has been sent." }
        }

        // 1. Generate Token
        // 32 bytes of random data -> converted to hex string
        const rawToken = randomBytes(32).toString('hex')

        // 2. Hash Token for DB storage
        const hashedToken = createHash('sha256').update(rawToken).digest('hex')

        const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 Hour

        // 3. Save to DB (Upsert to replace existing if any)
        if (user.role === 'UNIVERSITY' || user.role === 'STUDENT' || user.role === 'ADMIN') {
            // Clean up old tokens first (cascade delete handles it usually, but upsert is safer for one-to-one)
            await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })

            await prisma.passwordResetToken.create({
                data: {
                    token: hashedToken,
                    userId: user.id,
                    expiresAt
                }
            })

            // 4. Send Email
            const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${rawToken}`

            await sendEmail({
                to: email,
                subject: "Reset your EduMeetup Password",
                html: EmailTemplates.passwordReset(resetLink)
            })

            return { success: true, message: "If an account exists, a reset link has been sent." }
        }

        return { error: "Invalid user role for password reset." }

    } catch (error) {
        console.error("Forgot Password Error:", error)
        return { error: "Something went wrong. Please try again." }
    }
}

export async function updatePassword(formData: FormData) {
    const token = formData.get("token") as string
    const newPassword = formData.get("newPassword") as string
    const confirmPassword = formData.get("confirmPassword") as string

    if (!token || !newPassword) {
        return { error: "Missing fields" }
    }

    if (newPassword !== confirmPassword) {
        return { error: "Passwords do not match" }
    }

    if (newPassword.length < 8) {
        return { error: "Password must be at least 8 characters" }
    }

    try {
        // 1. Hash the incoming raw token to match the DB version
        const hashedToken = createHash("sha256").update(token).digest("hex")

        // 2. Find valid token
        const passwordResetToken = await prisma.passwordResetToken.findUnique({
            where: { token: hashedToken },
            include: { user: true }
        })

        if (!passwordResetToken) {
            return { error: "Invalid or expired token." }
        }

        if (passwordResetToken.expiresAt < new Date()) {
            // Cleanup expired
            await prisma.passwordResetToken.delete({ where: { id: passwordResetToken.id } })
            return { error: "Token expired. Please request a new one." }
        }

        // 3. Hash new password and update User
        const hashedPassword = await bcrypt.hash(newPassword, 12)

        await prisma.user.update({
            where: { id: passwordResetToken.userId },
            data: { password: hashedPassword } // Note: Schema uses 'password', not 'passwordHash'
        })

        // 4. Clean up: Delete the token so it can't be used again
        await prisma.passwordResetToken.delete({ where: { id: passwordResetToken.id } })

        return { success: true }

    } catch (error) {
        console.error("Update Password Error:", error)
        return { error: "Failed to reset password." }
    }
}
