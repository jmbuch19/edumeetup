import NextAuth from "next-auth"
import { authConfig } from "./lib/auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

// API routes that are genuinely public (no auth needed at the edge)
const PUBLIC_API_ROUTES = new Set([
    '/api/auth',                       // NextAuth internals
    '/api/validate-university-email',  // Called from the public registration form
    '/api/refresh-university-domains', // Has its own secret key check inside
    '/api/cron',                       // Has its own cron secret check inside
    '/api/dev-login',                  // Dev-only: returns magic link as JSON (disabled in prod)
])

// Dangerous internal/dev routes — only ADMIN may call these
const ADMIN_ONLY_API_ROUTES = [
    '/api/admin',
    '/api/promote-admin',
    '/api/setup-admin',
    '/api/seed',
    '/api/debug-login',
    '/api/get-magic-link',
]

export default auth((req) => {
    const { nextUrl } = req
    const isLoggedIn = !!req.auth
    const role = req.auth?.user?.role as "ADMIN" | "UNIVERSITY" | "UNIVERSITY_REP" | "STUDENT" | undefined

    const isAuthRoute = nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/register')
    const isStudentRoute = nextUrl.pathname.startsWith('/student')
    const isUniversityRoute = nextUrl.pathname.startsWith('/university')
    const isAdminRoute = nextUrl.pathname.startsWith('/admin')
    const isRegistrationPage = nextUrl.pathname === '/student/register' || nextUrl.pathname === '/university/register'
    const isUniversityLogin = nextUrl.pathname === '/university-login'
    const isApiRoute = nextUrl.pathname.startsWith('/api')

    // ── API ROUTE PROTECTION ────────────────────────────────────────────────
    if (isApiRoute) {
        // Allow truly public API routes through immediately
        const isPublic = Array.from(PUBLIC_API_ROUTES).some(p => nextUrl.pathname.startsWith(p))
        if (isPublic) return NextResponse.next()

        // All other API routes require authentication
        if (!isLoggedIn) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Admin-only API routes
        const isAdminApi = ADMIN_ONLY_API_ROUTES.some(p => nextUrl.pathname.startsWith(p))
        if (isAdminApi && role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // University-scoped API routes — UNIVERSITY_REP also allowed
        if (nextUrl.pathname.startsWith('/api/uni-docs') && role !== 'UNIVERSITY' && role !== 'UNIVERSITY_REP' && role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // CV upload is student-only; CV read is open to authenticated users (uni reps need it)
        if (nextUrl.pathname.startsWith('/api/cv/upload') && role !== 'STUDENT') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        return NextResponse.next()
    }

    // ── PAGE ROUTE PROTECTION ───────────────────────────────────────────────

    // Explicit /admin → /admin/dashboard redirect
    if (nextUrl.pathname === '/admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', nextUrl))
    }

    // Redirect logged-in users away from auth/landing pages
    if ((isAuthRoute || nextUrl.pathname === '/') && isLoggedIn) {
        if (role === 'ADMIN') return NextResponse.redirect(new URL('/admin/dashboard', nextUrl))
        if (role === 'UNIVERSITY') return NextResponse.redirect(new URL('/university/dashboard', nextUrl))
        if (role === 'UNIVERSITY_REP') return NextResponse.redirect(new URL('/university/dashboard', nextUrl))
        return NextResponse.redirect(new URL('/student/dashboard', nextUrl))
    }

    // Redirect unauthenticated users away from protected routes
    if (!isLoggedIn && !isRegistrationPage && !isUniversityLogin && (isStudentRoute || isUniversityRoute || isAdminRoute)) {
        const callbackUrl = nextUrl.pathname + (nextUrl.search || '')
        return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`, nextUrl))
    }

    // Cross-role enforcement — prevent users accessing wrong dashboards
    if (isLoggedIn) {
        if (isAdminRoute && role !== 'ADMIN') {
            const dest = (role === 'UNIVERSITY' || role === 'UNIVERSITY_REP') ? '/university/dashboard' : '/student/dashboard'
            return NextResponse.redirect(new URL(dest, nextUrl))
        }
        // UNIVERSITY_REP shares /university/* access with UNIVERSITY
        if (isUniversityRoute && role !== 'UNIVERSITY' && role !== 'UNIVERSITY_REP' && !isRegistrationPage) {
            return NextResponse.redirect(new URL('/student/dashboard', nextUrl))
        }
        if (isStudentRoute && (role === 'ADMIN' || role === 'UNIVERSITY' || role === 'UNIVERSITY_REP')) {
            const dest = role === 'ADMIN' ? '/admin/dashboard' : '/university/dashboard'
            return NextResponse.redirect(new URL(dest, nextUrl))
        }
    }

    return NextResponse.next()
})

export const config = {
    // Now includes /api routes. NextAuth's own /api/auth/* is handled by the
    // PUBLIC_API_ROUTES allowlist above, so no infinite loop risk.
    // IMPORTANT: api/auth must be excluded so NextAuth's email callback
    // (/api/auth/callback/email) is handled solely by the route handler
    // which has the full config + PrismaAdapter. If the middleware intercepts
    // it, the edge NextAuth instance (no adapter) throws MissingAdapter and
    // the login loop occurs.
    matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth|login|register).*)"],
}
