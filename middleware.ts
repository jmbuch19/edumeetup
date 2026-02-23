import NextAuth from "next-auth"
import { authConfig } from "./lib/auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
    const { nextUrl } = req
    const isLoggedIn = !!req.auth
    const user = req.auth?.user
    const role = (user as any)?.role

    const isAuthRoute = nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/register')
    const isPublicRoute = nextUrl.pathname === '/' || nextUrl.pathname.startsWith('/about') || nextUrl.pathname.startsWith('/contact')
    const isApiRoute = nextUrl.pathname.startsWith('/api')

    // 0. Redirect /admin to /admin/dashboard explicitly (since /admin folder has no page.tsx)
    if (nextUrl.pathname === '/admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', nextUrl))
    }

    // 1. Redirect logged-in users away from auth pages (login/register) AND Root (Landing)
    //    If they are logged in, they should go to their dashboard.
    if ((isAuthRoute || nextUrl.pathname === '/') && isLoggedIn) {
        if (role === 'ADMIN') {
            return NextResponse.redirect(new URL('/admin/dashboard', nextUrl))
        } else if (role === 'UNIVERSITY') {
            return NextResponse.redirect(new URL('/university/dashboard', nextUrl))
        } else {
            // Default to student dashboard
            return NextResponse.redirect(new URL('/student/dashboard', nextUrl))
        }
    }

    // 2. Protect Dashboard Routes (Basic Check)
    //    More granular checks happen in layout/page, but this keeps unauthorized users out of the route group entirely.
    const isStudentRoute = nextUrl.pathname.startsWith('/student')
    const isUniversityRoute = nextUrl.pathname.startsWith('/university')
    const isAdminRoute = nextUrl.pathname.startsWith('/admin')

    const isRegistrationPage = nextUrl.pathname === '/student/register' || nextUrl.pathname === '/university/register'
    const isUniversityLogin = nextUrl.pathname === '/university-login'

    if (!isLoggedIn && !isRegistrationPage && !isUniversityLogin && (isStudentRoute || isUniversityRoute || isAdminRoute)) {
        let callbackUrl = nextUrl.pathname
        if (nextUrl.search) {
            callbackUrl += nextUrl.search
        }
        return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`, nextUrl))
    }

    // 3. Cross-role protection — logged-in users can only access their own dashboard
    if (isLoggedIn) {
        if (isAdminRoute && role !== 'ADMIN') {
            // Students and university users can't access /admin/*
            const dest = role === 'UNIVERSITY' ? '/university/dashboard' : '/student/dashboard'
            return NextResponse.redirect(new URL(dest, nextUrl))
        }
        if (isUniversityRoute && role !== 'UNIVERSITY' && !isRegistrationPage) {
            // Students and admins can't access /university/* (except the public register page)
            const dest = role === 'ADMIN' ? '/admin/dashboard' : '/student/dashboard'
            return NextResponse.redirect(new URL(dest, nextUrl))
        }
        if (isStudentRoute && role !== 'STUDENT' && !isRegistrationPage) {
            // University and admin users can't access /student/* (except the public register page)
            const dest = role === 'ADMIN' ? '/admin/dashboard' : '/university/dashboard'
            return NextResponse.redirect(new URL(dest, nextUrl))
        }
    }

    return NextResponse.next()
})

export const config = {
    // Matcher ignoring static files and API routes that don't need auth (except we might want auth on some APIs later)
    // For now, exclude Next.js internals and static files
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
