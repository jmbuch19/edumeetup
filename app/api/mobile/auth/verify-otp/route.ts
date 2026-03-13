import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SignJWT, jwtVerify } from 'jose'
import crypto from 'crypto'

// In-memory OTP store — same store shared via module cache in the same serverless instance
// For multi-instance production, replace with Upstash Redis
const otpStore = new Map<string, { code: string; expires: number; userId: string; role: string }>()

const secretBytes = new TextEncoder().encode(process.env.AUTH_SECRET || 'fallback-secret')

async function signToken(payload: object, expiresIn: string) {
    return new SignJWT(payload as Record<string, unknown>)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .sign(secretBytes)
}

export async function POST(req: NextRequest) {
    try {
        const { email, code } = await req.json()

        if (!email || !code) {
            return NextResponse.json({ error: 'Email and code are required' }, { status: 400 })
        }

        const normalizedEmail = email.trim().toLowerCase()
        const record = otpStore.get(normalizedEmail)

        if (!record) {
            return NextResponse.json({ error: 'No pending code for this email' }, { status: 400 })
        }

        if (Date.now() > record.expires) {
            otpStore.delete(normalizedEmail)
            return NextResponse.json({ error: 'Code expired. Request a new one.' }, { status: 400 })
        }

        if (record.code !== code.trim()) {
            return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
        }

        // Consume the OTP (one-time use)
        otpStore.delete(normalizedEmail)

        // Fetch fresh user data
        const user = await prisma.user.findUnique({
            where: { id: record.userId },
            select: { id: true, email: true, name: true, role: true, isActive: true, image: true },
        })

        if (!user || !user.isActive) {
            return NextResponse.json({ error: 'Account not found or disabled' }, { status: 403 })
        }

        // Update lastSeenAt for students
        if (user.role === 'STUDENT') {
            await prisma.student.updateMany({
                where: { userId: user.id },
                data: { lastSeenAt: new Date() },
            })
        }

        // Issue tokens
        const tokenPayload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            type: 'mobile',
        }

        const accessToken = await signToken(tokenPayload, '7d')
        const refreshToken = await signToken({ ...tokenPayload, type: 'mobile-refresh' }, '30d')

        return NextResponse.json({
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                image: user.image,
            },
        })
    } catch (err) {
        console.error('[mobile/auth/verify-otp]', err)
        return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
    }
}
