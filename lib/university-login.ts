/**
 * Shared rules for the university portal login (magic link + Google).
 * Client-safe: no Prisma or server-only imports.
 */

export type UniversityLoginErrorCode =
    | 'NoUniversityAccount'
    | 'AccountDeactivated'
    | 'PendingVerification'

export const UNIVERSITY_LOGIN_ERRORS: Record<UniversityLoginErrorCode, string> = {
    NoUniversityAccount:
        "No university account is registered for this email. Register your institution first, or ask your university's EdUmeetup admin to add you as a representative.",
    AccountDeactivated:
        'This account has been deactivated. Please contact support@edumeetup.com.',
    PendingVerification:
        "Your university's registration is still being reviewed. We'll email you as soon as it's approved.",
}

export interface UniversityLoginAccount {
    role: string
    isActive: boolean
    university: { verificationStatus: string } | null
}

/** Returns why this account can't use the university portal, or null if it can. */
export function universityLoginBlock(account: UniversityLoginAccount | null): UniversityLoginErrorCode | null {
    if (!account || (account.role !== 'UNIVERSITY' && account.role !== 'UNIVERSITY_REP')) {
        return 'NoUniversityAccount'
    }
    if (!account.isActive) return 'AccountDeactivated'
    if (account.role === 'UNIVERSITY' && account.university?.verificationStatus !== 'VERIFIED') {
        return 'PendingVerification'
    }
    return null
}

/**
 * True when an OAuth sign-in was started from the university portal, judged by
 * the callback URL Auth.js stores in a cookie when the flow begins.
 */
export function isUniversityIntent(callbackUrl: string | null | undefined): boolean {
    if (!callbackUrl) return false
    let path: string
    try {
        path = new URL(callbackUrl, 'https://edumeetup.com').pathname
    } catch {
        return false
    }
    return path === '/university-login' || path === '/university' || path.startsWith('/university/')
}
