// Shared OTP store — accessible by both request-otp and verify-otp routes.
// In production, replace with Upstash Redis for multi-instance support.
import { SignJWT } from 'jose'

export const otpStore = new Map<string, { code: string; expires: number; userId: string; role: string }>()

export const jwtSecret = new TextEncoder().encode(process.env.AUTH_SECRET || 'fallback-secret')

export async function signMobileJwt(payload: object, expiresIn = '7d') {
    return new SignJWT(payload as Record<string, unknown>)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .sign(jwtSecret)
}
