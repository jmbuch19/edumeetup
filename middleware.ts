import { getToken } from "next-auth/jwt"
import { NextResponse, type NextRequest } from "next/server"

// ─── GOLDEN RULE ──────────────────────────────────────────────────────────────
// Use getToken() — NOT auth(req) — to read the session in middleware.
// auth(req as any) misuses the NextAuth v5 API: auth() called with a Request
// object tries to use it as a handler, returning undefined instead of a session.
// getToken() directly decodes the JWT cookie using AUTH_SECRET — edge-safe,
// no adapter, no NextAuth instance needed.
// ──────────────────────────────────────────────────────────────────────────────

export default async function middleware(req: NextRequest) {
    const { nextUrl } = req

    // ── STEP 1: ALL /api/ routes bypass this middleware completely ──────────
    // Auth callbacks MUST reach the full route handler with PrismaAdapter.
    if (nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.next()
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
