
import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import Email from "next-auth/providers/email"
import Google from "next-auth/providers/google"
import { Resend } from "resend"
import { redirect } from "next/navigation"
import { authConfig } from "./auth.config"

// ==============================================================================
// 1. RATE LIMITER
// ==============================================================================

// In-memory store: Map<email, { count, start }>
const rateLimitMap = new Map<string, { count: number; start: number }>()

const RATE_LIMIT_WINDOW = 10 * 60 * 1000 // 10 minutes in ms
const RATE_LIMIT_MAX_REQUESTS = 3

export function isRateLimited(email: string): boolean {
    const now = Date.now()
    const record = rateLimitMap.get(email)

    if (!record) {
        rateLimitMap.set(email, { count: 1, start: now })
        return false
    }

    // Reset window if expired
    if (now - record.start > RATE_LIMIT_WINDOW) {
        rateLimitMap.set(email, { count: 1, start: now })
        return false
    }

    record.count += 1
    return record.count > RATE_LIMIT_MAX_REQUESTS
}

export function getRateLimitResetSeconds(email: string): number {
    const now = Date.now()
    const record = rateLimitMap.get(email)

    if (!record) return 0

    const elapsed = now - record.start
    const remaining = RATE_LIMIT_WINDOW - elapsed

    if (remaining < 0) return 0
    return Math.ceil(remaining / 1000)
}

// ==============================================================================
// 2. DOMAIN FUNCTIONS
// ==============================================================================

const BLOCKED_DOMAINS = [
    "gmail.com", "yahoo.com", "yahoo.in", "hotmail.com",
    "outlook.com", "live.com", "icloud.com", "rediffmail.com",
    "protonmail.com", "proton.me", "mailinator.com", "tempmail.com"
]

const ALLOWED_SUFFIXES = [
    ".edu", ".ac.in", ".ac.uk", ".edu.au", ".ac.nz", ".edu.in", ".ac.za", ".edu.sg"
]


// isUniversityEmail is async so it can fall back to the DB for verified
// universities with non-standard domains (e.g. gtu.ac.in, mu.edu, etc.)
export async function isUniversityEmail(email: string): Promise<boolean> {
    if (!email || !email.includes('@')) return false

    const domain = email.split('@')[1].toLowerCase()

    // 1. Block known personal / disposable email providers
    if (BLOCKED_DOMAINS.includes(domain)) return false

    // 2. Accept well-known academic TLD suffixes
    if (ALLOWED_SUFFIXES.some(suffix => domain.endsWith(suffix))) return true

    // 3. Fall back to DB: check if any *verified* university has this contact domain
    try {
        const match = await prisma.university.findFirst({
            where: {
                isVerified: true,
                OR: [
                    { contactEmail: { endsWith: `@${domain}` } },
                    { repEmail: { endsWith: `@${domain}` } },
                ]
            },
            select: { id: true }
        })
        if (match) return true
    } catch {
        // DB unavailable — fail open to avoid blocking legit users
        console.warn(`[isUniversityEmail] DB lookup failed for domain: ${domain}`)
    }

    return false
}

export function isAnyValidEmail(email: string): boolean {
    // Basic regex for format validity
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email)
}

// ==============================================================================
// 3. EMAIL TEMPLATE & SENDER
// ==============================================================================

async function sendMagicLinkEmail(to: string, url: string) {
    const isUniLogin = url.includes("loginType=university") || decodeURIComponent(url).includes("loginType=university")
    const subject = isUniLogin
        ? "Your edUmeetup university portal sign-in link"
        : "Your edUmeetup sign-in link"

    const brandColor = "#4F46E5"
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #374151; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .logo { font-size: 24px; font-weight: bold; margin-bottom: 30px; letter-spacing: -0.5px; }
            .logo span { color: ${brandColor}; }
            .button { display: inline-block; padding: 12px 24px; background-color: ${brandColor}; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin: 20px 0; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
            .warning { font-size: 14px; color: #6b7280; margin-top: 20px; }
            .fallback { margin-top: 30px; font-size: 12px; color: #9ca3af; word-break: break-all; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo"><span>edU</span>meetup</div>
            <h1>Sign in to ${isUniLogin ? "University Portal" : "EduMeetup"}</h1>
            <p>Click the button below to sign in. This link is valid for <strong>15 minutes</strong> and can only be used once.</p>
            <a href="${url}" class="button" target="_blank">Sign in</a>
            <p class="warning">If you did not request this email, you can safely ignore it.</p>
            <div class="fallback">
                <p>Or copy and paste this link into your browser:</p>
                <p>${url}</p>
            </div>
            <div class="footer">
                <p>© ${new Date().getFullYear()} IAES (International Academic & Education Services). All rights reserved.</p>
                <p>EduMeetup is an initiative by IAES.</p>
            </div>
        </div>
    </body>
    </html>
    `

    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'EduMeetup <noreply@edumeetup.com>',
        to,
        subject,
        html,
        text: `Sign in to EduMeetup: ${url}`
    })

    if (error) {
        console.error('[RESEND ERROR] Magic link email failed:', error)
        throw new Error(error.message)
    }

    console.log(`[RESEND] Magic link sent to: ${to}`)
}

// ==============================================================================
// 4. AUTH CONFIG
// ==============================================================================

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    providers: [
        Email({
            // NextAuth requires `server` to exist for validation even when
            // sendVerificationRequest fully overrides sending (via Resend below).
            server: {
                host: 'localhost',
                port: 25,
                auth: { user: 'placeholder', pass: 'placeholder' }
            },
            from: process.env.EMAIL_FROM || 'EduMeetup <noreply@edumeetup.com>',
            maxAge: 15 * 60, // 15 minutes
            sendVerificationRequest: async ({ identifier, url }) => {
                // 1. Log to DB for bypass (Critical for debugging)
                try {
                    console.log(`[MAGIC LINK] Sent to ${identifier}`)
                    await prisma.systemLog.create({
                        data: {
                            level: 'INFO',
                            type: 'MAGIC_LINK',
                            message: `Magic link sent to ${identifier}`,
                            metadata: { email: identifier, sentAt: new Date().toISOString() }
                        }
                    })
                } catch (e) {
                    console.error("Failed to log magic link:", e)
                }

                // 2. Send Email (Standard)
                await sendMagicLinkEmail(identifier, url)
            },
        }),
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })
    ],
    callbacks: {
        async signIn({ user }) {
            console.log(`[AUTH DEBUG] SignIn attempt for: ${user.email}`)
            const email = user.email
            if (!email) {
                console.log(`[AUTH DEBUG] No email provided`)
                return false
            }

            // 1. Rate Limiter
            if (isRateLimited(email)) {
                console.log(`[AUTH DEBUG] Rate limited: ${email}`)
                return `/auth/error?error=RateLimited`
            }

            // 2. Database Checks
            try {
                const dbUser = await prisma.user.findUnique({
                    where: { email },
                    include: { university: true }
                })
                console.log(`[AUTH DEBUG] DB User found: ${!!dbUser} | Role: ${dbUser?.role} | Active: ${dbUser?.isActive}`)

                if (dbUser && !dbUser.isActive) {
                    console.log(`[AUTH DEBUG] User deactivated`)
                    return `/auth/error?error=AccountDeactivated`
                }

                if (dbUser) {
                    if (dbUser.role === 'UNIVERSITY') {
                        if (!await isUniversityEmail(email)) {
                            console.log(`[AUTH DEBUG] Invalid university email domain`)
                            return `/auth/error?error=NotUniversityEmail`
                        }
                        if (dbUser.university && !dbUser.university.isVerified) {
                            console.log(`[AUTH DEBUG] University pending verification`)
                            return `/auth/error?error=PendingVerification`
                        }
                    }
                }
                console.log(`[AUTH DEBUG] Login Allowed`)
                return true
            } catch (error) {
                console.error(`[AUTH DEBUG] Error in signIn callback:`, error)
                return false
            }
        },

        async jwt({ token, user, trigger }) {
            // On initial sign-in, stamp the token with id and role
            if (user) {
                token.id = user.id
                token.role = user.role
                token.lastRefreshed = Date.now()
            }

            // Refresh role + active status from DB every 5 minutes.
            // This ensures role changes and deactivations take effect quickly
            // without hitting the DB on every single request.
            const REFRESH_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
            const shouldRefresh =
                trigger === 'update' ||
                !token.lastRefreshed ||
                Date.now() - (token.lastRefreshed as number) > REFRESH_INTERVAL_MS

            if (shouldRefresh && token.sub) {
                const dbUser = await prisma.user.findUnique({
                    where: { id: token.sub },
                    select: { role: true, isActive: true }
                })
                if (dbUser) {
                    token.role = dbUser.role as any
                    token.lastRefreshed = Date.now()
                    if (!dbUser.isActive) return null // Force logout immediately
                }
            }

            return token
        },

        async session({ session, token }) {
            if (session.user && token.sub) {
                session.user.id = token.sub
                session.user.role = token.role!
            }
            return session
        },
    },
    events: {
        async signIn({ user, isNewUser }) {
            if (!user.email || !user.id) return

            // Single DB fetch — used for both emailVerified update and new-user setup
            const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
            if (!dbUser) return

            // Only stamp emailVerified if it hasn't been set yet (avoids a write on every login)
            if (!dbUser.emailVerified) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { emailVerified: new Date() }
                })
            }

            // Provision a Student profile row on first login
            if (isNewUser && dbUser.role === 'STUDENT') {
                await prisma.student.upsert({
                    where: { userId: dbUser.id },
                    create: { userId: dbUser.id, country: 'India' },
                    update: {}
                })
            }
        }
    }
})

// ==============================================================================
// 5. HELPER FUNCTIONS
// ==============================================================================

export async function requireUser() {
    const session = await auth()
    if (!session?.user) {
        redirect('/login')
    }
    return session.user
}

export async function requireRole(role: "ADMIN" | "UNIVERSITY" | "STUDENT") {
    const user = await requireUser()
    if (user.role !== role && user.role !== 'ADMIN') {
        if (user.role === 'STUDENT') redirect('/student/dashboard')
        if (user.role === 'UNIVERSITY') redirect('/university/dashboard')
        redirect('/login')
    }
    return user
}
