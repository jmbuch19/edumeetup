/**
 * safe-redirect.ts
 *
 * Validates redirect URLs against an allow-list of trusted paths/origins.
 * Prevents open-redirect and `javascript:` injection attacks where a crafted
 * URL could send a user to an external site (or run script) after login.
 *
 * Rules:
 *  - Relative paths (/student/dashboard) → safe, as long as they really are
 *    same-origin paths (no `//host`, `/\host`, backslashes or control chars)
 *  - Absolute URLs → must be https and the hostname must exactly match ALLOWED_HOSTS
 *  - Anything else (javascript:, data:, protocol-relative, malformed) → fallback
 */

const ALLOWED_HOSTS = new Set([
    'edumeetup.com',
    'www.edumeetup.com',
    // Add staging / preview domains here as needed:
    // 'staging.edumeetup.com',
])

/** Path NextAuth uses to consume a magic-link token. */
export const MAGIC_LINK_CALLBACK_PATH = '/api/auth/callback/email'

/** Placeholder origin used only to parse relative paths. */
const RELATIVE_PARSE_BASE = 'https://relative.invalid'

// Backslashes are treated as "/" by browsers (so "/\evil.com" === "//evil.com"),
// and whitespace/control characters are stripped by the URL parser, which can
// hide a scheme or host. Reject them outright.
// eslint-disable-next-line no-control-regex
const UNSAFE_CHARS = /[\\\u0000-\u001F\u007F\s]/

/**
 * True if `url` is a same-origin relative path such as `/student/dashboard?x=1`.
 * Rejects protocol-relative (`//evil.com`), backslash tricks (`/\evil.com`),
 * and anything that would resolve to a different origin.
 */
export function isSafeRelativePath(url: string): boolean {
    if (!url.startsWith('/') || url.startsWith('//') || UNSAFE_CHARS.test(url)) return false
    try {
        return new URL(url, RELATIVE_PARSE_BASE).origin === RELATIVE_PARSE_BASE
    } catch {
        return false
    }
}

/** Parses an absolute URL, rejecting unsafe characters and embedded credentials. */
function parseAbsolute(url: string): URL | null {
    if (UNSAFE_CHARS.test(url)) return null
    try {
        const parsed = new URL(url)
        if (parsed.username || parsed.password) return null
        return parsed
    } catch {
        return null
    }
}

/**
 * Returns `url` if it is safe to redirect to, otherwise returns `fallback`.
 *
 * @param url      - Candidate redirect URL (may be user-supplied)
 * @param fallback - Safe default path (e.g. '/student/dashboard')
 */
export function safeRedirect(url: string | null | undefined, fallback: string = '/'): string {
    if (!url) return fallback

    // 1. Relative paths stay on the same origin
    if (isSafeRelativePath(url)) return url

    // 2. Absolute URLs — must be https and the hostname must be in the allow-list
    const parsed = parseAbsolute(url)
    if (parsed && parsed.protocol === 'https:' && ALLOWED_HOSTS.has(parsed.hostname)) {
        return url
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
    if (isSafeRelativePath(url)) return url

    const redirect = parseAbsolute(url)
    if (!redirect) return null // caller should fall back to role-based default
    try {
        const base = new URL(baseUrl)
        // Exact origin match (scheme + host + port) — avoids startsWith bypass
        // and rejects javascript:/data: URLs, which have an opaque origin.
        if (redirect.origin === base.origin) return url
    } catch {
        // Malformed base URL — reject
    }

    return null
}

/**
 * Validates the `url` parameter of the /auth/confirm page (the anti-prefetch
 * interstitial in front of magic links). Only a link to our own NextAuth
 * email-callback endpoint is allowed, on the current origin or a trusted
 * EdUmeetup host over https.
 *
 * @param url           - Candidate callback URL from the query string
 * @param currentOrigin - window.location.origin (omit on the server)
 * @returns the normalised URL to navigate to, or null if it must not be followed
 */
export function getSafeMagicLinkCallbackUrl(
    url: string | null | undefined,
    currentOrigin?: string,
): string | null {
    if (!url) return null

    let parsed: URL | null = null
    if (isSafeRelativePath(url)) {
        if (!currentOrigin) return null
        try {
            parsed = new URL(url, currentOrigin)
        } catch {
            return null
        }
    } else {
        parsed = parseAbsolute(url)
    }
    if (!parsed) return null

    const sameOrigin = !!currentOrigin && parsed.origin === currentOrigin
    const trustedHost = parsed.protocol === 'https:' && ALLOWED_HOSTS.has(parsed.hostname) && !parsed.port
    if (!sameOrigin && !trustedHost) return null
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
    if (parsed.pathname !== MAGIC_LINK_CALLBACK_PATH) return null

    return parsed.href
}
