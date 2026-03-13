import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'

const secretBytes = new TextEncoder().encode(process.env.AUTH_SECRET || 'fallback-secret')

export async function verifyMobileToken(req: NextRequest) {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return null

    const token = authHeader.slice(7)

    try {
        const { payload } = await jwtVerify(token, secretBytes)
        if (payload.type !== 'mobile') return null
        return payload as { sub: string; email: string; role: string; type: string }
    } catch {
        return null
    }
}
