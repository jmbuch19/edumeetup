import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

const SESSION_COOKIE_NAME = 'edumeetup_session'

export async function createSession(email: string) {
    // 1. Generate new token
    const sessionToken = crypto.randomUUID()

    // 2. Update User in DB (Invalidates old sessions)
    await prisma.user.update({
        where: { email },
        data: { sessionToken }
    })

    // 3. Set Cookie
    const sessionData = JSON.stringify({ email, sessionToken })
    cookies().set(SESSION_COOKIE_NAME, sessionData, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
        sameSite: 'lax'
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

        // Single Session Check
        if (user.sessionToken !== sessionToken) {
            return null // Token mismatch = Logged out by newer session
        }

        return user

    } catch (e) {
        // Fallback or Invalid JSON (Legacy cookie maybe just string?)
        // If legacy cookie was just email string, we invalidate it because we enforce token now.
        return null
    }
}

export async function destroySession() {
    cookies().delete(SESSION_COOKIE_NAME)
}

export async function requireUser() {
    const user = await getSession()
    if (!user) {
        redirect('/login')
    }
    return user
}
