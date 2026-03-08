'use client'

/**
 * components/sentry-user-provider.tsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Sets the Sentry user context once the client mounts.
 * Every browser error captured after mount will carry the user's id, email and role.
 *
 * Usage in a Server Component:
 *   <SentryUserProvider userId={session.user.id} email={session.user.email} role={session.user.role} />
 *
 * On unauthenticated pages: don't render this component (or pass no userId).
 */

import { useEffect } from 'react'
import * as Sentry from "@sentry/nextjs";

interface Props {
    userId?: string | null
    email?: string | null
    role?: string | null
}

export function SentryUserProvider({ userId, email, role }: Props) {
    useEffect(() => {
        if (userId) {
            Sentry.setUser({
                id: userId,
                email: email ?? undefined,
                username: email ?? undefined,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                role: role as any,
            })
        } else {
            // Unauthenticated page — clear any stale user from previous session
            Sentry.setUser(null)
        }

        // Clean up if the user signs out mid-session without a full page reload
        return () => {
            Sentry.setUser(null)
        }
    }, [userId, email, role])

    // Renders nothing — pure side-effect component
    return null
}
