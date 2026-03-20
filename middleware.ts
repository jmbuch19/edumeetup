import { getToken } from "next-auth/jwt"
import { NextResponse, type NextRequest } from "next/server"
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Initialize Edge-compatible un-cached Redis Limiter
const edgeChatLimiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(20, '10 s'), // 20 requests per 10 seconds per IP
    ephemeralCache: new Map(),
})

// ─── GOLDEN RULE ──────────────────────────────────────────────────────────────
// This middleware handles NAVIGATION UX only — route gating and role-based redirects.
// It is NOT the security model. Every API route and server action enforces its own
// auth via lib/auth/requireAuth.ts (requireAuth, requireRole, requireAdmin, etc.)
// CSP is set in next.config.mjs headers() — not here.
// ──────────────────────────────────────────────────────────────────────────────

export default async function middleware(req: NextRequest) {
    const { nextUrl } = req

    // ── STEP 1: ALL /api/ routes bypass this middleware completely ──────────
    // Except /api/chat which requires edge ratelimits before Node initializes.
    if (nextUrl.pathname.startsWith('/api/')) {
        const isProtectedApi = nextUrl.pathname === '/api/chat' || 
                               nextUrl.pathname === '/api/student-chat' || 
                               nextUrl.pathname === '/api/auth/signin/email'

        if (isProtectedApi) {
            try {
                const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
                const { success } = await edgeChatLimiter.limit(`mw_chat_${ip}`)
                if (!success) {
                    console.log(`[middleware] Edge ratelimit blocked IP: ${ip}`)
                    return new NextResponse('Too Many Requests (Edge Block)', { status: 429 })
                }
            } catch (e) {
                // If Redis is unreachable, fail open so students aren't blocked
                console.warn('[middleware] Edge Ratelimit error:', (e as Error).message)
            }
        }
        return NextResponse.next()
    }

    // ── STEP 2: Public routes — always pass through, no auth needed ──────────
    // '/'            — home page (server component, handles its own display logic)
    // '/universities' — public university profiles
    // '/university/register', '/student/register' — registration flows
    // '/university-login' — university login page
    const isPublicRoute = (
        nextUrl.pathname === '/' ||
        nextUrl.pathname.startsWith('/universities') ||
        nextUrl.pathname.startsWith('/student/register') ||
        nextUrl.pathname.startsWith('/university/register') ||
        nextUrl.pathname === '/university-login'
    )
    if (isPublicRoute) {
        return NextResponse.next()
    }

    // ── STEP 3: Read JWT ──────────────────────────────────────────────────────
    // NextAuth v5 writes __Secure-authjs.session-token on HTTPS (prod) and
    // authjs.session-token on HTTP (dev). Pass secureCookie + salt explicitly
    // to avoid token appearing invalid → undefined role → redirect loop.
    const secret = process.env.AUTH_SECRET
    const secureCookie = nextUrl.protocol === 'https:'

    let token = await getToken({
        req,
        secret,
        secureCookie,
        cookieName: secureCookie ? '__Secure-authjs.session-token' : 'authjs.session-token',
        salt: secureCookie ? '__Secure-authjs.session-token' : 'authjs.session-token',
    })
    // Fallback: try the opposite cookie in case hosting environment varies
    if (!token) {
        token = await getToken({
            req,
            secret,
            secureCookie: false,
            cookieName: 'authjs.session-token',
            salt: 'authjs.session-token',
        })
    }

    // ── Check token expiry ────────────────────────────────────────────────────
    // getToken() returns the raw JWT payload without validating the exp claim.
    // An expired Admin token (24 h hard cap) would make middleware think the
    // user is logged in, while auth() in the layout returns null — producing a
    // redirect loop (/admin/dashboard ↔ /login?callbackUrl=...).
    const tokenExpired = token?.exp ? (token.exp as number) < Math.floor(Date.now() / 1000) : false

    const isLoggedIn = !!token && !tokenExpired
    const role = isLoggedIn ? (token?.role as "ADMIN" | "UNIVERSITY" | "UNIVERSITY_REP" | "STUDENT" | undefined) : undefined

    const isAuthRoute = nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/register')
    const isStudentRoute = nextUrl.pathname.startsWith('/student')
    const isUniversityRoute = nextUrl.pathname.startsWith('/university')
    const isAdminRoute = nextUrl.pathname.startsWith('/admin')

    // ── STEP 4: PAGE ROUTE PROTECTION ────────────────────────────────────────

    // Explicit /admin → /admin/dashboard canonical redirect
    if (nextUrl.pathname === '/admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', nextUrl))
    }

    // Redirect logged-in users away from login/register pages
    // NOTE: '/' is NOT in this list — it is handled as isPublicRoute above
    if (isAuthRoute && isLoggedIn) {
        if (role === 'ADMIN') return NextResponse.redirect(new URL('/admin/dashboard', nextUrl))
        if (role === 'UNIVERSITY' || role === 'UNIVERSITY_REP') return NextResponse.redirect(new URL('/university/dashboard', nextUrl))
        if (role === 'STUDENT') return NextResponse.redirect(new URL('/student/dashboard', nextUrl))
        // Unknown / unset role — let them through rather than loop
        return NextResponse.next()
    }

    // Redirect unauthenticated users away from protected routes
    if (!isLoggedIn && (isStudentRoute || isUniversityRoute || isAdminRoute)) {
        // Strip nested callbackUrl params to prevent snowballing
        // (e.g. /admin/dashboard?callbackUrl=/admin/dashboard → /admin/dashboard)
        const cleanSearch = (() => {
            if (!nextUrl.search) return ''
            const params = new URLSearchParams(nextUrl.search)
            params.delete('callbackUrl')
            const s = params.toString()
            return s ? `?${s}` : ''
        })()
        const callbackUrl = nextUrl.pathname + cleanSearch
        return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`, nextUrl))
    }

    // Cross-role enforcement — only run when role is known to prevent loops
    if (isLoggedIn && role) {
        if (isAdminRoute && role !== 'ADMIN') {
            const dest = (role === 'UNIVERSITY' || role === 'UNIVERSITY_REP') ? '/university/dashboard' : '/student/dashboard'
            return NextResponse.redirect(new URL(dest, nextUrl))
        }
        if (isUniversityRoute && role !== 'UNIVERSITY' && role !== 'UNIVERSITY_REP') {
            return NextResponse.redirect(new URL('/student/dashboard', nextUrl))
        }
        if (isStudentRoute && (role === 'ADMIN' || role === 'UNIVERSITY' || role === 'UNIVERSITY_REP')) {
            const dest = role === 'ADMIN' ? '/admin/dashboard' : '/university/dashboard'
            return NextResponse.redirect(new URL(dest, nextUrl))
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|api).*)",
        "/api/chat",
        "/api/student-chat",
        "/api/auth/signin/email"
    ],
}
