import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'

const secretBytes = new TextEncoder().encode(process.env.AUTH_SECRET || 'fallback-secret')

export async function POST(req: NextRequest) {
    try {
        const { refreshToken } = await req.json()

        if (!refreshToken) {
            return NextResponse.json({ error: 'Refresh token required' }, { status: 400 })
        }

        // Verify the refresh token
        const { payload } = await jwtVerify(refreshToken, secretBytes)

        if (payload.type !== 'mobile-refresh') {
            return NextResponse.json({ error: 'Invalid token type' }, { status: 401 })
        }

        // Issue a new access token with the same claims
        const newAccessToken = await new SignJWT({
            sub: payload.sub,
            email: payload.email,
            role: payload.role,
            type: 'mobile',
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('7d')
            .sign(secretBytes)

        return NextResponse.json({ accessToken: newAccessToken })
    } catch (err) {
        console.error('[mobile/auth/refresh]')
        return NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 })
    }
}
