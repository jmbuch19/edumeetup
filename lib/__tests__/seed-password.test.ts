import * as assert from 'node:assert'
import { test } from 'node:test'
import { assertSeedAllowed, resolveSeedPassword, MIN_SEED_PASSWORD_LENGTH } from '../seed-password'

// To run this: npx tsx --test lib/__tests__/seed-password.test.ts

test('resolveSeedPassword', async (t) => {
    await t.test('uses the env var when set', () => {
        const result = resolveSeedPassword('SEED_ADMIN_PASSWORD', { SEED_ADMIN_PASSWORD: '  a-long-local-password  ' })
        assert.deepStrictEqual(result, { password: 'a-long-local-password', generated: false })
    })

    await t.test('rejects short env passwords', () => {
        assert.throws(() => resolveSeedPassword('SEED_ADMIN_PASSWORD', { SEED_ADMIN_PASSWORD: 'short' }))
    })

    await t.test('generates a strong random password when unset', () => {
        const a = resolveSeedPassword('SEED_ADMIN_PASSWORD', {})
        const b = resolveSeedPassword('SEED_ADMIN_PASSWORD', {})
        assert.strictEqual(a.generated, true)
        assert.ok(a.password.length >= MIN_SEED_PASSWORD_LENGTH)
        assert.notStrictEqual(a.password, b.password)
    })
})

test('assertSeedAllowed', () => {
    assert.doesNotThrow(() => assertSeedAllowed({ NODE_ENV: 'development' }))
    assert.doesNotThrow(() => assertSeedAllowed({}))
    assert.throws(() => assertSeedAllowed({ NODE_ENV: 'production' }))
    assert.doesNotThrow(() => assertSeedAllowed({ NODE_ENV: 'production', ALLOW_PRODUCTION_SEED: 'true' }))
})
