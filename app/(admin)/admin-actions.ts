'use server'

export async function adminLogout() {
    // Dynamic import — avoids module-level lib/auth load which crashes on cold start
    const { signOut } = await import('@/lib/auth')
    await signOut({ redirectTo: '/' })
}
