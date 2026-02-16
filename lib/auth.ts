import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { compare, hash } from 'bcryptjs'
import { createHash } from 'crypto'

const SESSION_COOKIE_NAME = 'edumeetup_session'

export async function hashPassword(password: string) {
    return await hash(password, 12)
}

export async function comparePassword(plain: string, hashed: string) {
    return await compare(plain, hashed)
}

function hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
}

export async function createSession(email: string, role: string) {
    // 1. Generate new token
    const sessionToken = crypto.randomUUID()
    const hashedToken = hashToken(sessionToken)

    // 2. Update User in DB (Invalidates old sessions)
    await prisma.user.update({
        where: { email },
        data: { sessionToken: hashedToken }
    })

    // 3. Set Cookie (Store RAW token)
    const sessionData = JSON.stringify({ email, sessionToken, role })
    cookies().set(SESSION_COOKIE_NAME, sessionData, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
        sameSite: 'lax',
        priority: 'high'
    })
}

export async function getSession() {
    const cookie = cookies().get(SESSION_COOKIE_NAME)
    if (!cookie?.value) return null

    try {
        // Try parsing JSON (New format)
        const { email, sessionToken } = JSON.parse(cookie.value)

        if (!email || !sessionToken) return null

        // Verify against DB
        const user = await prisma.user.findUnique({
            where: { email },
            include: { studentProfile: true, universityProfile: true }
        })

        if (!user) return null

        // Single Session Check (Hash Comparison)
        const hashedToken = hashToken(sessionToken)
        if (user.sessionToken !== hashedToken) {
            return null // Token mismatch = Logged out by newer session
        }

        // Return user (Prisma user object already has role, but we validated session)
        return user

    } catch {
        // Fallback or Invalid JSON (Legacy cookie maybe just string?)
        // If legacy cookie was just email string, we invalidate it because we enforce token now.
        return null
    }
}

export async function destroySession() {
    const cookie = cookies().get(SESSION_COOKIE_NAME)

    if (cookie?.value) {
        try {
            const { email } = JSON.parse(cookie.value)
            if (email) {
                await prisma.user.update({
                    where: { email },
                    data: { sessionToken: null }
                })
            }
        } catch {
            // Ignore error if cookie is invalid, just delete it
        }
    }

    cookies().delete(SESSION_COOKIE_NAME)
}


export async function requireUser() {
    const user = await getSession()
    if (!user) {
        redirect('/login')
    }
    return user
}

export async function requireRole(role: string) {
    const user = await requireUser()
    if (user.role !== role) {
        redirect('/') // or strictly throw error
    }
    return user
}
