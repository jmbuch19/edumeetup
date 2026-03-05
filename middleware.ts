import { getToken } from "next-auth/jwt"
import { NextResponse, type NextRequest } from "next/server"

// ─── GOLDEN RULE ──────────────────────────────────────────────────────────────
// Use getToken() — NOT auth(req) — to read the session in middleware.
// auth(req as any) misuses the NextAuth v5 API: auth() called with a Request
// object tries to use it as a handler, returning undefined instead of a session.
// getToken() directly decodes the JWT cookie using AUTH_SECRET — edge-safe,
// no adapter, no NextAuth instance needed.
// ──────────────────────────────────────────────────────────────────────────────

// ─── CSP nonce helper ─────────────────────────────────────────────────────────
// Generates a unique nonce per request. Using 'strict-dynamic' allows Next.js
// to load its own scripts without 'unsafe-inline'. The nonce is forwarded to
// the root layout via the x-nonce request header.
function buildCspHeader(nonce: string): string {
    return [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
        `style-src 'self' 'unsafe-inline'`,     // inline styles still needed (Tailwind/emotion)
        "img-src 'self' data: blob: https://files.edumeetup.com https://lh3.googleusercontent.com https://*.googleusercontent.com",
        "font-src 'self' data:",
        "connect-src 'self' https://*.neon.tech https://api.resend.com https://o4508957447987200.ingest.sentry.io",
        "media-src 'self'",
        "object-src 'none'",
        "frame-src 'none'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "upgrade-insecure-requests",
    ].join('; ')
}

export default async function middleware(req: NextRequest) {
    const { nextUrl } = req

    // Generate a fresh nonce for every request
    const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
    const csp = buildCspHeader(nonce)

    // ── STEP 1: ALL /api/ routes bypass auth middleware completely ──────────
    // Auth callbacks MUST reach the full route handler with PrismaAdapter.
    if (nextUrl.pathname.startsWith('/api/')) {
        const res = NextResponse.next()
        res.headers.set('Content-Security-Policy', csp)
        return res
    }

    // ── STEP 2: Read JWT directly from cookie ───────────────────────────────
    // NextAuth v5 (auth.js) uses a different cookie name than v4:
    //   v4: next-auth.session-token
    //   v5: authjs.session-token  (prod: __Secure-authjs.session-token)
    // getToken() defaults to the v4 name, so we MUST pass cookieName explicitly.
    const isProduction = process.env.NODE_ENV === 'production'
    const token = await getToken({
        req,
        secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
        cookieName: isProduction
            ? '__Secure-authjs.session-token'
            : 'authjs.session-token',
    })
    const isLoggedIn = !!token
    const role = token?.role as "ADMIN" | "UNIVERSITY" | "UNIVERSITY_REP" | "STUDENT" | undefined

    const isAuthRoute = nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/register')
    const isStudentRoute = nextUrl.pathname.startsWith('/student')
    const isUniversityRoute = nextUrl.pathname.startsWith('/university')
    const isAdminRoute = nextUrl.pathname.startsWith('/admin')
    const isRegistrationPage = nextUrl.pathname === '/student/register' || nextUrl.pathname === '/university/register'
    const isUniversityLogin = nextUrl.pathname === '/university-login'

    // ── STEP 3: PAGE ROUTE PROTECTION ───────────────────────────────────────

    // Explicit /admin → /admin/dashboard redirect
    if (nextUrl.pathname === '/admin') {
        const res = NextResponse.redirect(new URL('/admin/dashboard', nextUrl))
        res.headers.set('Content-Security-Policy', csp)
        return res
    }

    // Redirect logged-in users away from auth/landing pages
    if ((isAuthRoute || nextUrl.pathname === '/') && isLoggedIn) {
        let dest = '/student/dashboard'
        if (role === 'ADMIN') dest = '/admin/dashboard'
        else if (role === 'UNIVERSITY' || role === 'UNIVERSITY_REP') dest = '/university/dashboard'
        const res = NextResponse.redirect(new URL(dest, nextUrl))
        res.headers.set('Content-Security-Policy', csp)
        return res
    }

    // Redirect unauthenticated users away from protected routes
    if (!isLoggedIn && !isRegistrationPage && !isUniversityLogin && (isStudentRoute || isUniversityRoute || isAdminRoute)) {
        const callbackUrl = nextUrl.pathname + (nextUrl.search || '')
        const res = NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`, nextUrl))
        res.headers.set('Content-Security-Policy', csp)
        return res
    }

    // Cross-role enforcement — prevent users accessing wrong dashboards
    if (isLoggedIn) {
        if (isAdminRoute && role !== 'ADMIN') {
            const dest = (role === 'UNIVERSITY' || role === 'UNIVERSITY_REP') ? '/university/dashboard' : '/student/dashboard'
            const res = NextResponse.redirect(new URL(dest, nextUrl))
            res.headers.set('Content-Security-Policy', csp)
            return res
        }
        if (isUniversityRoute && role !== 'UNIVERSITY' && role !== 'UNIVERSITY_REP' && !isRegistrationPage) {
            const res = NextResponse.redirect(new URL('/student/dashboard', nextUrl))
            res.headers.set('Content-Security-Policy', csp)
            return res
        }
        if (isStudentRoute && (role === 'ADMIN' || role === 'UNIVERSITY' || role === 'UNIVERSITY_REP')) {
            const dest = role === 'ADMIN' ? '/admin/dashboard' : '/university/dashboard'
            const res = NextResponse.redirect(new URL(dest, nextUrl))
            res.headers.set('Content-Security-Policy', csp)
            return res
        }
    }

    // Pass through — attach CSP and forward nonce to root layout via request header
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-nonce', nonce)

    const res = NextResponse.next({ request: { headers: requestHeaders } })
    res.headers.set('Content-Security-Policy', csp)
    return res
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|login|register|api).*)" ],
}
