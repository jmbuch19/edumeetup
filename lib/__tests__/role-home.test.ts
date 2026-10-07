import * as assert from 'node:assert'
import { test } from 'node:test'
import { homePathForRole, isSessionCookie } from '../role-home'

test('homePathForRole sends every role to a page that exists', () => {
    assert.strictEqual(homePathForRole('ADMIN'), '/admin/dashboard')
    assert.strictEqual(homePathForRole('UNIVERSITY'), '/university/dashboard')
    assert.strictEqual(homePathForRole('UNIVERSITY_REP'), '/university/dashboard')
    assert.strictEqual(homePathForRole('STUDENT'), '/student/dashboard')
    assert.strictEqual(homePathForRole('ALUMNI'), '/alumni/dashboard')
    assert.strictEqual(homePathForRole('EVENT_PLANNER'), '/fair-ops')
    assert.strictEqual(homePathForRole(undefined), '/')
})

test('isSessionCookie', () => {
    for (const n of ['authjs.session-token', '__Secure-authjs.session-token', '__Secure-authjs.session-token.0', 'authjs.session-token.1']) {
        assert.strictEqual(isSessionCookie(n), true, n)
    }
    for (const n of ['authjs.csrf-token', '__Secure-authjs.callback-url', 'session-token', 'xauthjs.session-token']) {
        assert.strictEqual(isSessionCookie(n), false, n)
    }
})
