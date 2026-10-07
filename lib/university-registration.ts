/**
 * university-registration.ts
 *
 * Pure helpers for the public university registration flow
 * (`registerUniversityWithPrograms` in app/actions.ts).
 *
 * Kept free of Prisma / Next.js imports so they can be unit tested.
 */

import {
    extractDomain as defaultExtractDomain,
    getUniversityInfo as defaultGetUniversityInfo,
    isDisposableDomain as defaultIsDisposableDomain,
    waitForCache as defaultWaitForCache,
    type UniversityInfo,
} from './university-domains'

/** User-facing messages. Deliberately generic: never include raw error text. */
export const UNIVERSITY_REGISTRATION_MESSAGES = {
    missingFields: 'Please fill in all required fields and try again.',
    personalEmail: 'Personal or generic email providers are not allowed. Please use an official university email.',
    unrecognisedDomain: 'Email domain not recognized as an official university. Please use your institutional email.',
    verificationUnavailable: "We couldn't verify your institutional email right now. Please try again in a few minutes.",
    accountExists:
        "We couldn't complete registration with this email address. If you already have an EdUmeetup account, please sign in from the University Login page instead.",
    botCheckFailed:
        "We couldn't confirm you're human. Please wait a moment and press \u201cConfirm & Register\u201d again. If this keeps happening, disable ad or tracker blockers for this site, or try another browser.",
    rateLimited: 'Too many attempts. Please wait a few minutes and try again.',
    generic: 'Something went wrong while creating your account. Please try again, or contact us if the problem continues.',
} as const

const GENERIC_PROVIDERS = new Set([
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'proton.me', 'icloud.com',
    'yandex.com', 'mail.ru', 'qq.com', '163.com', 'rediffmail.com',
])

/** Lower-cases and trims an email address. */
export function normalizeEmail(email: unknown): string {
    return typeof email === 'string' ? email.trim().toLowerCase() : ''
}

export interface DomainCheckDeps {
    extractDomain: (email: string) => string | null
    getUniversityInfo: (domain: string) => UniversityInfo | null
    isDisposableDomain: (domain: string) => boolean
    waitForCache: () => Promise<void>
}

const defaultDeps: DomainCheckDeps = {
    extractDomain: defaultExtractDomain,
    getUniversityInfo: defaultGetUniversityInfo,
    isDisposableDomain: defaultIsDisposableDomain,
    waitForCache: defaultWaitForCache,
}

export type DomainCheckResult =
    | { ok: true; domain: string; info: UniversityInfo }
    | { ok: false; error: string; reason: 'personal' | 'unrecognised' | 'unavailable' }

/**
 * Validates that an email belongs to a recognised university domain.
 *
 * FAILS CLOSED: if the domain list can't be loaded or anything throws,
 * the email is rejected rather than allowed through.
 */
export async function checkInstitutionalEmail(
    email: string,
    deps: DomainCheckDeps = defaultDeps,
): Promise<DomainCheckResult> {
    try {
        const domain = deps.extractDomain(normalizeEmail(email))
        if (!domain || GENERIC_PROVIDERS.has(domain) || deps.isDisposableDomain(domain)) {
            return { ok: false, reason: 'personal', error: UNIVERSITY_REGISTRATION_MESSAGES.personalEmail }
        }
        await deps.waitForCache()
        const info = deps.getUniversityInfo(domain)
        if (!info) {
            return { ok: false, reason: 'unrecognised', error: UNIVERSITY_REGISTRATION_MESSAGES.unrecognisedDomain }
        }
        return { ok: true, domain, info }
    } catch (err) {
        console.error('[registerUniversity] Email domain validation failed (rejecting):', err)
        return { ok: false, reason: 'unavailable', error: UNIVERSITY_REGISTRATION_MESSAGES.verificationUnavailable }
    }
}
