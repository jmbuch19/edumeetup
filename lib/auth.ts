
import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import Email from "next-auth/providers/email"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
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

/** Manual domain allowlist — testing / institutions with non-standard TLDs. Keep in sync with lib/university-domains.ts. */
const MANUAL_DOMAIN_ALLOWLIST = new Set([
    'iaesgujarat.org',
])

// isUniversityEmail is async so it can fall back to the DB for verified
// universities with non-standard domains (e.g. gtu.ac.in, mu.edu, etc.)
export async function isUniversityEmail(email: string): Promise<boolean> {
    if (!email || !email.includes('@')) return false

    const domain = email.split('@')[1].toLowerCase()

    // 1. Block known personal / disposable email providers
    if (BLOCKED_DOMAINS.includes(domain)) return false

    // 1.5 Manual allowlist — beats TLD restrictions for testing / non-standard domains
    if (MANUAL_DOMAIN_ALLOWLIST.has(domain)) return true

    // 2. Accept well-known academic TLD suffixes
    if (ALLOWED_SUFFIXES.some(suffix => domain.endsWith(suffix))) return true

    // 3. Fall back to DB: check if any *verified* university has this contact domain
    try {
        const match = await prisma.university.findFirst({
            where: {
                verificationStatus: 'VERIFIED',
                OR: [
                    { contactEmail: { endsWith: `@${domain}` } },
                    { repEmail: { endsWith: `@${domain}` } },
                ]
            },
            select: { id: true }
        })
        if (match) return true
    } catch {
        // DB lookup failed — fail closed (safer than allowing unknown domains)
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
        ? "Your EdUmeetup university portal sign-in link"
        : "Your EdUmeetup sign-in link"

    const brandColor = "#3333CC"
    // Wrap the real callback URL in /auth/confirm to prevent Gmail/Outlook
    // link pre-fetching from consuming the single-use token before the user clicks.
    const confirmUrl = `${process.env.NEXTAUTH_URL || 'https://edumeetup.com'}/auth/confirm?url=${encodeURIComponent(url)}`

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
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">Ed<span>U</span>meetup</div>
            <h1>Sign in to ${isUniLogin ? "University Portal" : "EdUmeetup"}</h1>
            <p>Click the button below to sign in. This link is valid for <strong>15 minutes</strong> and can only be used once.</p>
            <a href="${confirmUrl}" class="button" target="_blank">Sign in to EdUmeetup</a>
            <p class="warning">If you did not request this email, you can safely ignore it.</p>
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} IAES (Indo American Education Society). All rights reserved.</p>
                <p>EdUmeetup is an initiative by IAES.</p>
            </div>
        </div>
    </body>
    </html>
    `

    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'EdUmeetup <noreply@edumeetup.com>',
        to,
        subject,
        html,
        text: `Sign in to EdUmeetup — open this link in your browser to complete sign-in: ${confirmUrl}`
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
    adapter: PrismaAdapter(prisma) as any,
    session: {
        strategy: "jwt",
        maxAge: 7 * 24 * 60 * 60, // 7 days for students & universities
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
            from: process.env.EMAIL_FROM || 'EdUmeetup <noreply@edumeetup.com>',
            maxAge: 15 * 60, // 15 minutes
            sendVerificationRequest: async ({ identifier, url }) => {
                // DEV: log magic link to terminal — no email needed for local testing
                if (process.env.NODE_ENV === 'development') {
                    console.log('\n' + '='.repeat(60))
                    console.log('🔗 MAGIC LINK (dev mode — click to login):')
                    console.log(url)
                    console.log('='.repeat(60) + '\n')
                }

                // Audit log — records that a link was sent, NOT the URL itself
                try {
                    await prisma.systemLog.create({
                        data: {
                            level: 'INFO',
                            type: 'MAGIC_LINK',
                            message: `Magic link sent to ${identifier}`,
                            metadata: { email: identifier, sentAt: new Date().toISOString() }
                        }
                    })
                } catch (e) {
                    console.error("Failed to write magic link audit log:", e)
                }

                // Send Email (skipped in dev if no RESEND_API_KEY)
                if (process.env.RESEND_API_KEY) {
                    await sendMagicLinkEmail(identifier, url)
                } else {
                    console.warn('[dev] RESEND_API_KEY not set — email not sent. Use the URL above.')
                }
            },
        }),
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true, // Allows user to migrate from Magic Link to Google seamlessly
        }),
        // ⚠️ DEV ONLY — passwordless email login, disabled in production
        ...(process.env.NODE_ENV === 'development' ? [
            Credentials({
                id: 'dev',
                name: 'Dev Login',
                credentials: { email: { label: 'Email', type: 'email' } },
                async authorize(credentials): Promise<any> {
                    if (!credentials?.email) return null
                    const user = await prisma.user.findUnique({
                        where: { email: String(credentials.email) },
                        select: { id: true, email: true, name: true, isActive: true }
                    })
                    if (!user || !user.isActive) return null
                    return { id: user.id, email: user.email, name: user.name }
                }
            })
        ] : [])
    ],
    callbacks: {
        async signIn({ user }) {
            const email = user.email
            if (!email) return false

            // 1. Rate Limiter
            if (isRateLimited(email)) {
                return `/auth/error?error=RateLimited`
            }

            // Note: We no longer try to update user.role here for new Google users.
            // NextAuth fires the `signIn` callback BEFORE creating the user in the DB.
            // PrismaAdapter handles the default 'STUDENT' role during creation automatically.

            // 2. Database Checks
            try {
                // Use a targeted select — avoid `include: { university: true }` which loads
                // ALL university columns and will crash if the DB schema is out of sync
                // (e.g. a column exists in schema.prisma but hasn't been migrated yet).
                const dbUser = await prisma.user.findUnique({
                    where: { email },
                    select: {
                        role: true,
                        isActive: true,
                        university: {
                            select: { verificationStatus: true }
                        }
                    }
                })

                if (dbUser && !dbUser.isActive) {
                    return `/auth/error?error=AccountDeactivated`
                }

                if (dbUser) {
                    if (dbUser.role === 'UNIVERSITY') {
                        if (!await isUniversityEmail(email)) {
                            return `/auth/error?error=NotUniversityEmail`
                        }
                        if (dbUser.university && dbUser.university.verificationStatus !== 'VERIFIED') {
                            return `/auth/error?error=PendingVerification`
                        }
                    }
                }
                return true
            } catch (error) {
                console.error(`[AUTH signIn] DB error for ${email}:`, {
                    message: error instanceof Error ? error.message : String(error),
                    code: (error as any)?.code,
                    meta: (error as any)?.meta,
                    stack: error instanceof Error ? error.stack?.slice(0, 500) : undefined,
                })
                return false
            }
        },

        async jwt({ token, user, trigger }) {
            if (user) {
                token.id = user.id
            }

            // 15 min interval — 3× less DB traffic than the previous 5 min
            const REFRESH_INTERVAL_MS = 15 * 60 * 1000
            const shouldRefresh =
                !!user ||
                trigger === 'update' ||
                !token.lastRefreshed ||
                Date.now() - (token.lastRefreshed as number) > REFRESH_INTERVAL_MS

            if (shouldRefresh && token.sub) {
                console.log(`[AUTH jwt] Refreshing role for sub=${token.sub}`)

                // Primary lookup: by ID (the happy path)
                let dbUser = await prisma.user.findUnique({
                    where: { id: token.sub },
                    select: { id: true, role: true, isActive: true }
                })

                // Fallback: sub doesn't match any ID — try by email (handles re-provisioned accounts)
                if (!dbUser && token.email) {
                    console.warn(`[AUTH jwt] sub=${token.sub} not in DB — trying email fallback`)
                    dbUser = await prisma.user.findFirst({
                        where: { email: token.email as string },
                        select: { id: true, role: true, isActive: true }
                    })
                    if (dbUser) {
                        // Patch token.sub so future lookups use the real DB id
                        token.sub = dbUser.id
                        console.log(`[AUTH jwt] Patched sub to ${dbUser.id} via email fallback`)
                    }
                }

                if (dbUser) {
                    token.role = dbUser.role as any
                    token.lastRefreshed = Date.now()
                    console.log(`[AUTH jwt] Stamped role=${token.role} for sub=${token.sub}`)
                    if (!dbUser.isActive) return null

                    // Admin gets a short 24h hard cap
                    if (dbUser.role === 'ADMIN') {
                        const oneDayFromNow = Math.floor(Date.now() / 1000) + 24 * 60 * 60
                        if (!token.exp || (token.exp as number) > oneDayFromNow) {
                            token.exp = oneDayFromNow
                        }
                    }
                } else {
                    // No user found by ID or email — token is orphaned, clear it
                    // This stops the refresh storm and sends the user to /login cleanly
                    console.warn(`[AUTH jwt] Orphaned token for sub=${token.sub} — invalidating session`)
                    return null
                }
            }

            return token
        },

        async session({ session, token }) {
            if (session.user && token.sub) {
                session.user.id = token.sub
                session.user.role = token.role!
                console.log(`[AUTH session] user=${session.user.email} role=${token.role}`)
            }
            return session
        },

        async redirect(params) {
            const { url, baseUrl } = params
            console.log(`[AUTH redirect] url=${url} baseUrl=${baseUrl}`)

            // Use safeAuthRedirect which does exact hostname comparison via new URL()
            // rather than startsWith(baseUrl) — prevents subdomain-bypass attacks
            // e.g. https://edumeetup.com.evil.com would pass startsWith but not this check
            const { safeAuthRedirect } = await import('./safe-redirect')
            const safe = safeAuthRedirect(url, baseUrl)
            if (safe) return safe.startsWith('/') ? `${baseUrl}${safe}` : safe

            // Role-aware fallback — avoids UX flash when middleware hasn't corrected yet
            const role = (params as any)?.token?.role
            if (role === 'ADMIN') return `${baseUrl}/admin/dashboard`
            if (role === 'UNIVERSITY' || role === 'UNIVERSITY_REP') return `${baseUrl}/university/dashboard`
            if (role === 'ALUMNI') return `${baseUrl}/alumni/dashboard`
            return `${baseUrl}/student/dashboard`
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

            // Provision a Student profile row on first login (NOT for ALUMNI — their profile is created by the /alumni-register form)
            if (isNewUser && dbUser.role === 'STUDENT') {
                await prisma.student.upsert({
                    where: { userId: dbUser.id },
                    create: { userId: dbUser.id, country: 'India' },
                    update: {}
                })
            }

            // Stamp lastSeenAt on every student login (used for dormant detection)
            if (dbUser.role === 'STUDENT') {
                await prisma.student.updateMany({
                    where: { userId: dbUser.id },
                    data: { lastSeenAt: new Date() }
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
    if (user.role !== role) {
        if (user.role === 'ADMIN') redirect('/admin/dashboard')
        if (user.role === 'STUDENT') redirect('/student/dashboard')
        if (user.role === 'UNIVERSITY' || user.role === 'UNIVERSITY_REP') redirect('/university/dashboard')
        redirect('/login')
    }
    return user
}
