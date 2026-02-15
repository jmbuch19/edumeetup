import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const session = request.cookies.get('edumeetup_session')

    // Protect Admin Routes
    if (request.nextUrl.pathname.startsWith('/admin')) {
        if (!session) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
        try {
            const { role } = JSON.parse(session.value)
            if (role !== 'ADMIN') {
                return NextResponse.redirect(new URL('/', request.url))
            }
        } catch (e) {
            // Invalid cookie format
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    // Protect Student Dashboard
    if (request.nextUrl.pathname.startsWith('/student/dashboard')) {
        if (!session) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
        // Optional: Enforce role === 'STUDENT' if strictness required
    }

    // Protect University Dashboard
    if (request.nextUrl.pathname.startsWith('/university/dashboard')) {
        if (!session) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
        try {
            const { role } = JSON.parse(session.value)
            if (role !== 'UNIVERSITY') {
                return NextResponse.redirect(new URL('/', request.url)) // or unauthorized page
            }
        } catch (e) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/admin/:path*',
        '/student/dashboard/:path*',
        '/university/dashboard/:path*',
    ],
}
