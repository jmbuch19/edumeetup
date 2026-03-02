'use client'

/**
 * SessionGuard
 *
 * Enforces "shared device" sign-out on browser close.
 *
 * How it works:
 * 1. On every page load, checks localStorage for 'em_shared_device' flag
 *    (set by the login page when user unchecks "Trust this device").
 * 2. If the flag is set, checks sessionStorage for 'em_session_active'.
 *    sessionStorage clears when the browser/tab closes.
 *    → Flag present + sessionStorage key absent = new browser session on shared device → sign out.
 * 3. Same browser session (sessionStorage key exists) → do nothing, stay logged in.
 *
 * Deliberately avoids useSession / SessionProvider — not used in this app.
 * Uses document.cookie to detect an active NextAuth session instead.
 */

import { useEffect } from 'react'
import { signOut } from 'next-auth/react'

function hasSessionCookie(): boolean {
    if (typeof document === 'undefined') return false
    // NextAuth sets __Secure-authjs.session-token in prod (HTTPS) or authjs.session-token in dev
    return document.cookie.includes('authjs.session-token') ||
        document.cookie.includes('__Secure-authjs.session-token') ||
        document.cookie.includes('next-auth.session-token') ||
        document.cookie.includes('__Secure-next-auth.session-token')
}

export function SessionGuard() {
    useEffect(() => {
        const isSharedDevice = localStorage.getItem('em_shared_device') === '1'
        if (!isSharedDevice) return

        // Mark this browser session as active
        const activeThisSession = sessionStorage.getItem('em_session_active')

        if (!activeThisSession && hasSessionCookie()) {
            // New browser session on a shared/untrusted device and user is logged in → sign out
            localStorage.removeItem('em_shared_device')
            signOut({ redirect: true, callbackUrl: '/login' })
        } else if (activeThisSession) {
            // Already marked this session — keep it active
            sessionStorage.setItem('em_session_active', '1')
        } else {
            // No session cookie → nothing to do
            sessionStorage.setItem('em_session_active', '1')
        }
    }, [])

    return null
}

