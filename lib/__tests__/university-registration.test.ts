import * as assert from 'node:assert'
import { test } from 'node:test'
import {
    checkInstitutionalEmail,
    normalizeEmail,
    UNIVERSITY_REGISTRATION_MESSAGES as M,
    type DomainCheckDeps,
} from '../university-registration'

// To run this: npx tsx --test lib/__tests__/university-registration.test.ts

function makeDeps(overrides: Partial<DomainCheckDeps> = {}): DomainCheckDeps {
    return {
        extractDomain: (email: string) => {
            const parts = email.split('@')
            return parts.length === 2 && parts[1] ? parts[1] : null
        },
        getUniversityInfo: (domain: string) =>
            domain === 'ox.ac.uk' ? { name: 'University of Oxford', country: 'United Kingdom' } : null,
        isDisposableDomain: (domain: string) => domain === 'mailinator.com',
        waitForCache: async () => {},
        ...overrides,
    }
}

test('normalizeEmail', () => {
    assert.strictEqual(normalizeEmail('  Admissions@OX.ac.uk '), 'admissions@ox.ac.uk')
    assert.strictEqual(normalizeEmail(undefined), '')
    assert.strictEqual(normalizeEmail(42), '')
})

test('checkInstitutionalEmail', async (t) => {
    await t.test('accepts a recognised university domain (case-insensitive)', async () => {
        const result = await checkInstitutionalEmail('Admissions@OX.AC.UK', makeDeps())
        assert.deepStrictEqual(result, {
            ok: true,
            domain: 'ox.ac.uk',
            info: { name: 'University of Oxford', country: 'United Kingdom' },
        })
    })

    await t.test('rejects generic providers', async () => {
        const result = await checkInstitutionalEmail('someone@gmail.com', makeDeps())
        assert.strictEqual(result.ok, false)
        if (!result.ok) assert.strictEqual(result.error, M.personalEmail)
    })

    await t.test('rejects disposable providers', async () => {
        const result = await checkInstitutionalEmail('someone@mailinator.com', makeDeps())
        assert.strictEqual(result.ok, false)
        if (!result.ok) assert.strictEqual(result.reason, 'personal')
    })

    await t.test('rejects malformed emails', async () => {
        const result = await checkInstitutionalEmail('not-an-email', makeDeps())
        assert.strictEqual(result.ok, false)
    })

    await t.test('rejects unrecognised domains', async () => {
        const result = await checkInstitutionalEmail('someone@example.org', makeDeps())
        assert.strictEqual(result.ok, false)
        if (!result.ok) assert.strictEqual(result.error, M.unrecognisedDomain)
    })

    await t.test('FAILS CLOSED when the domain list cannot be loaded', async () => {
        const originalError = console.error
        console.error = () => {}
        try {
            const result = await checkInstitutionalEmail('admissions@ox.ac.uk', makeDeps({
                waitForCache: async () => { throw new Error('network down') },
            }))
            assert.strictEqual(result.ok, false)
            if (!result.ok) {
                assert.strictEqual(result.reason, 'unavailable')
                assert.strictEqual(result.error, M.verificationUnavailable)
                assert.ok(!result.error.includes('network down'), 'must not leak raw error text')
            }
        } finally {
            console.error = originalError
        }
    })

    await t.test('FAILS CLOSED when the lookup itself throws', async () => {
        const originalError = console.error
        console.error = () => {}
        try {
            const result = await checkInstitutionalEmail('admissions@ox.ac.uk', makeDeps({
                getUniversityInfo: () => { throw new Error('boom') },
            }))
            assert.strictEqual(result.ok, false)
        } finally {
            console.error = originalError
        }
    })
})

test('user-facing messages never promise success for existing accounts', () => {
    assert.ok(!/success/i.test(M.accountExists))
    assert.ok(M.accountExists.includes('sign in'))
})
