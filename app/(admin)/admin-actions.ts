'use server'

export async function adminLogout() {
    // Dynamic import — avoids module-level lib/auth load which crashes on cold start
    const { signOut } = await import('@/lib/auth')
    await signOut({ redirectTo: '/' })
}

export async function adminRelogin() {
    // Used by the session-expired interstitial.
    // Must sign out first to clear the cookie — otherwise the middleware
    // still sees a valid JWT and bounces the user back to /admin/dashboard.
    const { signOut } = await import('@/lib/auth')
    await signOut({ redirectTo: '/login' })
}
