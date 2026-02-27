import NextAuth from "next-auth"
import { authConfig } from "./lib/auth.config"
import { NextResponse, type NextRequest } from "next/server"

const { auth } = NextAuth(authConfig)

// ─── GOLDEN RULE ──────────────────────────────────────────────────────────────
// NEVER use the NextAuth `auth()` wrapper as the default export middleware.
// The auth() wrapper processes auth actions (like /api/auth/callback/email)
// BEFORE any of our custom guard logic runs. Since it uses the lightweight
// authConfig (no PrismaAdapter), it throws MissingAdapter on email callbacks.
//
// Instead: use a plain async function and call auth(req) manually ONLY after
// hard-blocking all /api/ routes first.
// ──────────────────────────────────────────────────────────────────────────────

export default async function middleware(req: NextRequest) {
    const { nextUrl } = req

    // ── STEP 1: ALL /api/ routes bypass this middleware completely ──────────
    // API routes either protect themselves (requireUser) or are public.
    // The NextAuth email callback MUST reach the full route handler which
    // has PrismaAdapter. Never let the edge middleware touch /api/*.
    if (nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.next()
    }

    // ── STEP 2: Get session (safe — only called for non-API paths) ──────────
    const session = await auth(req as any)
    const isLoggedIn = !!(session as any)?.user
    const role = (session as any)?.user?.role as "ADMIN" | "UNIVERSITY" | "UNIVERSITY_REP" | "STUDENT" | undefined

    const isAuthRoute = nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/register')
    const isStudentRoute = nextUrl.pathname.startsWith('/student')
    const isUniversityRoute = nextUrl.pathname.startsWith('/university')
    const isAdminRoute = nextUrl.pathname.startsWith('/admin')
    const isRegistrationPage = nextUrl.pathname === '/student/register' || nextUrl.pathname === '/university/register'
    const isUniversityLogin = nextUrl.pathname === '/university-login'

    // ── STEP 3: PAGE ROUTE PROTECTION ───────────────────────────────────────

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
        if (isUniversityRoute && role !== 'UNIVERSITY' && role !== 'UNIVERSITY_REP' && !isRegistrationPage) {
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
    matcher: ["/((?!_next/static|_next/image|favicon.ico|login|register|api).*)"],
}
