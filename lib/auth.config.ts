
import type { NextAuthConfig } from "next-auth"

// Dev-only startup warning: reminds engineers that trustHost must be set in code,
// not just via the AUTH_TRUST_HOST env var, to ensure consistent behaviour.
if (process.env.NODE_ENV === "development" && process.env.AUTH_TRUST_HOST) {
    console.warn(
        "[auth.config] ⚠️  AUTH_TRUST_HOST env var is set, but trustHost is also hardcoded in " +
        "auth.config.ts (preferred). The code value takes precedence in all environments."
    )
}

export const authConfig = {
    // Required for production deployments behind reverse proxies (Netlify, Vercel, etc.)
    // Without this, Auth.js v5 rejects all /api/auth/* callbacks with UntrustedHost error.
    // See: https://authjs.dev/getting-started/deployment#trust-host
    trustHost: true,
    pages: {
        signIn: '/login',
        verifyRequest: '/auth/verify-request',
        error: '/auth/error',
        newUser: '/onboarding'
    },
    providers: [], // Providers configured in auth.ts
    callbacks: {
        authorized({ auth, request }) {
            const isLoggedIn = !!auth?.user
            const { nextUrl } = request
            const isOnDashboard = nextUrl.pathname.startsWith('/student/dashboard') || nextUrl.pathname.startsWith('/university/dashboard') || nextUrl.pathname.startsWith('/admin')

            // Granular redirect logic is handled in middleware.ts.
            // Return true here so the request passes through to middleware.
            return true
        }
    }
} satisfies NextAuthConfig
