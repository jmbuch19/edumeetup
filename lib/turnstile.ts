// lib/turnstile.ts
// Cloudflare Turnstile server-side token verification
// Call this in every server action that handles a public form

export async function verifyTurnstile(token: string | null | undefined): Promise<{
  success: boolean
  error?: string
}> {
  if (!token) {
    return { success: false, error: 'Bot protection token missing. Please refresh and try again.' }
  }

  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    // If secret not configured — fail open in dev, fail closed in prod
    if (process.env.NODE_ENV === 'development') {
      console.warn('[turnstile] TURNSTILE_SECRET_KEY not set — skipping in dev')
      return { success: true }
    }
    return { success: false, error: 'Bot protection misconfigured.' }
  }

  try {
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret,
          response: token,
        }),
      }
    )

    const data = await response.json()

    if (!data.success) {
      // Log failed verification to SystemLog
      try {
        const { prisma } = await import('@/lib/prisma')
        await prisma.systemLog.create({
          data: {
            level: 'WARN',
            type: 'TURNSTILE_FAIL',
            message: 'Turnstile verification failed',
            metadata: {
              errorCodes: data['error-codes'] ?? [],
              timestamp: new Date().toISOString(),
            }
          }
        })
      } catch { /* non-fatal */ }

      return { success: false, error: 'Bot protection check failed. Please refresh and try again.' }
    }

    return { success: true }
  } catch (e) {
    console.error('[turnstile] verification error:', e)
    // Network error reaching Cloudflare — fail open to avoid
    // blocking legitimate users during Cloudflare outage
    return { success: true }
  }
}
