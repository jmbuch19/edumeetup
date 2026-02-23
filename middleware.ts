import NextAuth from "next-auth"
import { authConfig } from "./lib/auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
    const { nextUrl } = req
    const isLoggedIn = !!req.auth
    const role = req.auth?.user?.role as "ADMIN" | "UNIVERSITY" | "STUDENT" | undefined

    const isAuthRoute = nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/register')
    const isStudentRoute = nextUrl.pathname.startsWith('/student')
    const isUniversityRoute = nextUrl.pathname.startsWith('/university')
    const isAdminRoute = nextUrl.pathname.startsWith('/admin')
    const isRegistrationPage = nextUrl.pathname === '/student/register' || nextUrl.pathname === '/university/register'
    const isUniversityLogin = nextUrl.pathname === '/university-login'

    // Explicit /admin → /admin/dashboard redirect
    if (nextUrl.pathname === '/admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', nextUrl))
    }

    // Redirect logged-in users away from auth/landing pages
    if ((isAuthRoute || nextUrl.pathname === '/') && isLoggedIn) {
        if (role === 'ADMIN') return NextResponse.redirect(new URL('/admin/dashboard', nextUrl))
        if (role === 'UNIVERSITY') return NextResponse.redirect(new URL('/university/dashboard', nextUrl))
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
            return NextResponse.redirect(new URL('/student/dashboard', nextUrl))
        }
        if (isUniversityRoute && role !== 'UNIVERSITY' && !isRegistrationPage) {
            return NextResponse.redirect(new URL('/student/dashboard', nextUrl))
        }
        if (isStudentRoute && role === 'ADMIN') {
            return NextResponse.redirect(new URL('/admin/dashboard', nextUrl))
        }
    }

    return NextResponse.next()
})

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|register).*)"],
}
