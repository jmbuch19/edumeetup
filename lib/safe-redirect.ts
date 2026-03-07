/**
 * safe-redirect.ts
 *
 * Validates a redirect URL against an allow-list of trusted paths/origins.
 * Prevents open-redirect attacks where a crafted callbackUrl could send
 * a user to an external site after login.
 *
 * Rule:
 *  - Relative paths (/student/dashboard) → always safe
 *  - Absolute URLs → hostname must exactly match ALLOWED_HOSTS
 *  - Anything else  → fall back to the provided default
 */

const ALLOWED_HOSTS = new Set([
    'edumeetup.com',
    'www.edumeetup.com',
    // Add staging / preview domains here as needed:
    // 'staging.edumeetup.com',
])

/**
 * Returns `url` if it is safe to redirect to, otherwise returns `fallback`.
 *
 * @param url      - Candidate redirect URL (may be user-supplied)
 * @param fallback - Safe default path (e.g. '/student/dashboard')
 */
export function safeRedirect(url: string | null | undefined, fallback: string = '/'): string {
    if (!url) return fallback

    // 1. Relative paths are always safe — they stay on the same origin
    if (url.startsWith('/') && !url.startsWith('//')) return url

    // 2. Absolute URLs — parse and check hostname
    try {
        const parsed = new URL(url)
        // Must be https and the hostname must be in the allow-list
        if (parsed.protocol === 'https:' && ALLOWED_HOSTS.has(parsed.hostname)) {
            return url
        }
    } catch {
        // Not a valid URL at all — fall through to default
    }

    return fallback
}

/**
 * Validates the `url` param inside Next Auth's redirect() callback.
 * Uses proper URL parsing rather than startsWith() to avoid
 * subdomain-bypass attacks (e.g. https://edumeetup.com.evil.com).
 *
 * @param url     - The URL Next Auth wants to redirect to
 * @param baseUrl - The app's canonical base URL (e.g. https://edumeetup.com)
 */
export function safeAuthRedirect(url: string, baseUrl: string): string | null {
    // Relative paths — safe, let Next Auth prepend baseUrl
    if (url.startsWith('/') && !url.startsWith('//')) return url

    try {
        const redirect = new URL(url)
        const base = new URL(baseUrl)
        // Exact hostname match — avoids startsWith bypass
        if (redirect.hostname === base.hostname) return url
    } catch {
        // Malformed URL — reject
    }

    return null // caller should fall back to role-based default
}
