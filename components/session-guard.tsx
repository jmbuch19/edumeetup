'use client'

/**
 * SessionGuard
 *
 * Enforces "shared device" sign-out on browser close.
 *
 * How it works:
 * 1. On every page load, checks localStorage for 'em_shared_device' flag
 *    (set by the login page when user unchecks "Trust this device")
 * 2. If the flag is set, also checks sessionStorage for 'em_session_active'
 *    - sessionStorage is cleared when the browser/tab is closed
 *    - So if the flag is present but sessionStorage key is absent → new browser session
 *      on a shared device → sign the user out, remove flag
 * 3. If it's the same browser session (sessionStorage key exists), do nothing —
 *    the user stays logged in while their tab/window is open.
 */

import { useEffect } from 'react'
import { signOut, useSession } from 'next-auth/react'

export function SessionGuard() {
    const { status } = useSession()

    useEffect(() => {
        if (status !== 'authenticated') return

        const isSharedDevice = localStorage.getItem('em_shared_device') === '1'
        if (!isSharedDevice) return

        const activeThisSession = sessionStorage.getItem('em_session_active')
        if (!activeThisSession) {
            // New browser session on a shared/untrusted device → sign out
            localStorage.removeItem('em_shared_device')
            signOut({ redirectTo: '/login' })
        }
    }, [status])

    useEffect(() => {
        // Mark this tab/browser session as active (cleared on browser close)
        const isSharedDevice = localStorage.getItem('em_shared_device') === '1'
        if (isSharedDevice) {
            sessionStorage.setItem('em_session_active', '1')
        }
    }, [])

    return null
}
