import * as assert from 'node:assert'
import { test } from 'node:test'
import { isDashboardPath } from '../dashboard-routes'

test('isDashboardPath', async (t) => {
    await t.test('dashboard sections', () => {
        for (const p of ['/student', '/student/dashboard', '/university/meetings', '/admin', '/admin/users']) {
            assert.strictEqual(isDashboardPath(p), true, p)
        }
    })

    await t.test('public pages sharing a prefix stay public', () => {
        for (const p of ['/universities', '/universities/abc', '/universities/group/x', '/university-login', '/administration', '/students']) {
            assert.strictEqual(isDashboardPath(p), false, p)
        }
    })

    await t.test('public registration pages stay public', () => {
        assert.strictEqual(isDashboardPath('/student/register'), false)
        assert.strictEqual(isDashboardPath('/university/register'), false)
        assert.strictEqual(isDashboardPath('/student/registered-events'), true)
    })

    await t.test('empty input', () => {
        assert.strictEqual(isDashboardPath(''), false)
        assert.strictEqual(isDashboardPath(null), false)
    })
})
