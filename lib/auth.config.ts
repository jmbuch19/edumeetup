
import type { NextAuthConfig } from "next-auth"

export const authConfig = {
    pages: {
        signIn: '/login',
        verifyRequest: '/auth/verify-request',
        error: '/auth/error',
        newUser: '/onboarding'
    },
    providers: [], // Providers configured in auth.ts
    callbacks: {
        authorized({ auth, request: nextUrl }) {
            const isLoggedIn = !!auth?.user
            const isOnDashboard = nextUrl.pathname.startsWith('/student/dashboard') || nextUrl.pathname.startsWith('/university/dashboard') || nextUrl.pathname.startsWith('/admin')

            // We handle granular redirects in middleware.ts, so we return true here to let middleware chain proceed
            // unless we want to block strictly here. 
            // My middleware.ts has extensive logic, so I will let it handle the heavy lifting.
            // Returning true here allows the request to pass to the middleware logic I wrote.
            return true
        }
    }
} satisfies NextAuthConfig
