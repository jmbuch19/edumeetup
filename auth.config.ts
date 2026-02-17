import type { NextAuthConfig } from "next-auth"

export const authConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const isOnDashboard = nextUrl.pathname.startsWith('/student') ||
                nextUrl.pathname.startsWith('/university') ||
                nextUrl.pathname.startsWith('/admin')

            if (isOnDashboard) {
                if (isLoggedIn) return true
                return false // Redirect unauthenticated users to login page
            } else if (isLoggedIn) {
                // Redirect to dashboard if already logged in and on login page?
                // For now, keep it simple.
                return true
            }
            return true
        },
    },
    providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig
