import * as assert from 'node:assert'
import { test } from 'node:test'
import {
    getSafeMagicLinkCallbackUrl,
    isSafeRelativePath,
    safeAuthRedirect,
    safeRedirect,
} from '../safe-redirect'

// To run this: npx tsx --test lib/__tests__/safe-redirect.test.ts

const CALLBACK = 'https://edumeetup.com/api/auth/callback/email?callbackUrl=%2Fstudent%2Fdashboard&token=abc123&email=a%40b.com'

const ATTACKS = [
    'javascript:alert(document.cookie)//api/auth/callback/email',
    'JaVaScRiPt:alert(1)//https://edumeetup.com/api/auth/callback/email',
    ' javascript:alert(1)//api/auth/callback/email',
    'java\tscript:alert(1)//api/auth/callback/email',
    'data:text/html,<script>alert(1)</script>/api/auth/callback/email',
    'vbscript:msgbox(1)//api/auth/callback/email',
    '//evil.com/api/auth/callback/email',
    '/\\evil.com/api/auth/callback/email',
    '\\\\evil.com/api/auth/callback/email',
    'https://evil.com/api/auth/callback/email',
    'https://evil.com/?x=/api/auth/callback/email',
    'https://edumeetup.com.evil.com/api/auth/callback/email',
    'https://edumeetup.com@evil.com/api/auth/callback/email',
    'https://user:pass@edumeetup.com/api/auth/callback/email',
    'http://edumeetup.com/api/auth/callback/email',
    'https://edumeetup.com:8443/api/auth/callback/email',
    'https://edumeetup.com/evil?next=/api/auth/callback/email',
    'https://edumeetup.com/api/auth/callback/email/../../../logout',
    '',
]

test('getSafeMagicLinkCallbackUrl', async (t) => {
    await t.test('accepts the real magic-link callback on the trusted host', () => {
        assert.strictEqual(getSafeMagicLinkCallbackUrl(CALLBACK, 'https://edumeetup.com'), CALLBACK)
        assert.strictEqual(getSafeMagicLinkCallbackUrl(CALLBACK), CALLBACK, 'works without a known origin (server render)')
    })

    await t.test('accepts www and same-origin dev/preview callbacks', () => {
        const www = CALLBACK.replace('https://edumeetup.com', 'https://www.edumeetup.com')
        assert.strictEqual(getSafeMagicLinkCallbackUrl(www, 'https://edumeetup.com'), www)
        const dev = CALLBACK.replace('https://edumeetup.com', 'http://localhost:3000')
        assert.strictEqual(getSafeMagicLinkCallbackUrl(dev, 'http://localhost:3000'), dev)
        assert.strictEqual(getSafeMagicLinkCallbackUrl(dev, 'https://edumeetup.com'), null, 'localhost only when it IS the current origin')
    })

    await t.test('accepts a relative callback path on the current origin', () => {
        assert.strictEqual(
            getSafeMagicLinkCallbackUrl('/api/auth/callback/email?token=x', 'https://edumeetup.com'),
            'https://edumeetup.com/api/auth/callback/email?token=x',
        )
    })

    for (const attack of ATTACKS) {
        await t.test(`rejects ${JSON.stringify(attack)}`, () => {
            assert.strictEqual(getSafeMagicLinkCallbackUrl(attack, 'https://edumeetup.com'), null)
        })
    }

    await t.test('rejects null/undefined', () => {
        assert.strictEqual(getSafeMagicLinkCallbackUrl(null, 'https://edumeetup.com'), null)
        assert.strictEqual(getSafeMagicLinkCallbackUrl(undefined), null)
    })
})

test('isSafeRelativePath', () => {
    assert.strictEqual(isSafeRelativePath('/student/dashboard'), true)
    assert.strictEqual(isSafeRelativePath('/university/dashboard?tab=fairs#x'), true)
    assert.strictEqual(isSafeRelativePath('//evil.com'), false)
    assert.strictEqual(isSafeRelativePath('/\\evil.com'), false)
    assert.strictEqual(isSafeRelativePath('/\tevil'), false)
    assert.strictEqual(isSafeRelativePath('javascript:alert(1)'), false)
    assert.strictEqual(isSafeRelativePath('student/dashboard'), false)
})

test('safeRedirect', () => {
    assert.strictEqual(safeRedirect('/student/dashboard', '/'), '/student/dashboard')
    assert.strictEqual(safeRedirect('https://edumeetup.com/university/dashboard', '/'), 'https://edumeetup.com/university/dashboard')
    assert.strictEqual(safeRedirect(null, '/fallback'), '/fallback')
    for (const bad of [
        '//evil.com', '/\\evil.com', '/\\/evil.com', 'javascript:alert(1)', 'data:text/html,hi',
        'http://edumeetup.com/x', 'https://evil.com', 'https://edumeetup.com.evil.com',
        'https://edumeetup.com@evil.com', 'https://a:b@edumeetup.com/', ' https://evil.com',
    ]) {
        assert.strictEqual(safeRedirect(bad, '/fallback'), '/fallback', `should reject ${JSON.stringify(bad)}`)
    }
})

test('safeAuthRedirect', () => {
    const base = 'https://edumeetup.com'
    assert.strictEqual(safeAuthRedirect('/student/dashboard', base), '/student/dashboard')
    assert.strictEqual(safeAuthRedirect('https://edumeetup.com/admin/dashboard', base), 'https://edumeetup.com/admin/dashboard')
    for (const bad of [
        '//evil.com', '/\\evil.com', 'javascript:alert(1)', 'data:text/html,hi',
        'https://evil.com', 'https://edumeetup.com.evil.com', 'https://edumeetup.com@evil.com',
        'http://edumeetup.com/student/dashboard', 'https://edumeetup.com:8443/',
    ]) {
        assert.strictEqual(safeAuthRedirect(bad, base), null, `should reject ${JSON.stringify(bad)}`)
    }
})
