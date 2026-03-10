import { getToken } from "next-auth/jwt"
import { NextResponse, type NextRequest } from "next/server"

// ─── GOLDEN RULE ──────────────────────────────────────────────────────────────
// This middleware handles NAVIGATION UX only — route gating and role-based redirects.
// It is NOT the security model. Every API route and server action enforces its own
// auth via lib/auth/requireAuth.ts (requireAuth, requireRole, requireAdmin, etc.)
// CSP is set in next.config.mjs headers() — not here.
// ──────────────────────────────────────────────────────────────────────────────

export default async function middleware(req: NextRequest) {
    const { nextUrl } = req

    // ── STEP 1: ALL /api/ routes bypass this middleware completely ──────────
    // Auth callbacks MUST reach the full route handler with PrismaAdapter.
    // API security is enforced server-side in each route handler.
    if (nextUrl.pathname.startsWith('/api/')) {
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

    const isLoggedIn = !!token
    const role = token?.role as "ADMIN" | "UNIVERSITY" | "UNIVERSITY_REP" | "STUDENT" | undefined

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
        const callbackUrl = nextUrl.pathname + (nextUrl.search || '')
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
    matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)",],
}
