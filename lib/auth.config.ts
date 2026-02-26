
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
    trustHost: true,
    pages: {
        signIn: '/login',
        verifyRequest: '/auth/verify-request',
        error: '/auth/error',
        newUser: '/onboarding'
    },
    providers: [], // Providers configured in auth.ts
    session: { strategy: "jwt" as const },
    callbacks: {
        authorized({ auth, request }) {
            // Granular redirect logic is handled in middleware.ts.
            return true
        },
        // IMPORTANT: This session callback runs in the middleware (edge runtime).
        // It MUST NOT import Prisma or any Node-only module.
        // Its sole job is to surface token.role so middleware can do role-based routing.
        async session({ session, token }: any) {
            if (session.user && token?.sub) {
                session.user.id = token.sub
                session.user.role = token.role
            }
            return session
        },
    }
} satisfies NextAuthConfig
