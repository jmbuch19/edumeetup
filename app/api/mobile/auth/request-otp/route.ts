import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { SignJWT } from 'jose'
import crypto from 'crypto'
import { otpStore } from '@/lib/auth/mobile-otp-store'

export async function POST(req: NextRequest) {
  try {
    const { email, role } = await req.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Look up user in DB
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, name: true, role: true, isActive: true, image: true },
    })

    if (!user || !user.isActive) {
      // Return a generic message even if user not found (prevent enumeration)
      return NextResponse.json({ message: 'If this email is registered, a code has been sent.' })
    }

    // Role check
    const requestedRole = role === 'university' ? ['UNIVERSITY', 'UNIVERSITY_REP'] : ['STUDENT']
    if (!requestedRole.includes(user.role)) {
      return NextResponse.json({ error: 'Invalid role for this account' }, { status: 403 })
    }

    // Generate 6-digit OTP
    const code = crypto.randomInt(100000, 999999).toString()
    const expires = Date.now() + 10 * 60 * 1000 // 10 minutes

    otpStore.set(normalizedEmail, { code, expires, userId: user.id, role: user.role })

    // Send OTP via email
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'EdUmeetup <noreply@edumeetup.com>',
      to: normalizedEmail,
      subject: 'EdUmeetup Mobile App — Your sign-in code',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, sans-serif; max-width: 400px; margin: 40px auto; padding: 20px; color: #1a1a2e;">
          <div style="text-align: center;">
            <h2 style="color: #1B2B6B;">EdUmeetup Mobile</h2>
            <p>Your sign-in code is:</p>
            <div style="font-size: 48px; font-weight: 800; color: #1B2B6B; letter-spacing: 8px; margin: 20px 0;">
              ${code}
            </div>
            <p style="color: #5C6480; font-size: 14px;">This code expires in 10 minutes.</p>
            <p style="color: #9AA0BC; font-size: 12px;">If you didn't request this, ignore this email.</p>
          </div>
        </body>
        </html>
      `,
    })

    return NextResponse.json({ message: 'Code sent to your email.' })
  } catch (err) {
    console.error('[mobile/auth/request-otp]', err)
    return NextResponse.json({ error: 'Failed to send code' }, { status: 500 })
  }
}

