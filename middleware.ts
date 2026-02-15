import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const session = request.cookies.get('edumeetup_session')

    // Protect Admin Routes
    if (request.nextUrl.pathname.startsWith('/admin')) {
        if (!session) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    // Protect Student Dashboard
    if (request.nextUrl.pathname.startsWith('/student')) {
        // Specifically protect dashboard, ignore public student registration if needed (though usually public)
        // Actually /student/register is public. 
        // We should only protect /student/dashboard
        if (request.nextUrl.pathname.startsWith('/student/dashboard') && !session) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    // Protect University Dashboard
    if (request.nextUrl.pathname.startsWith('/university/dashboard')) {
        if (!session) {
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
