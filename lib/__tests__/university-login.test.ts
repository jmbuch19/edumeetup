import * as assert from 'node:assert'
import { test } from 'node:test'
import { universityLoginBlock, isUniversityIntent } from '../university-login'

const uni = (status: string, isActive = true) => ({ role: 'UNIVERSITY', isActive, university: { verificationStatus: status } })

test('universityLoginBlock', async (t) => {
    await t.test('verified university and reps may log in', () => {
        assert.strictEqual(universityLoginBlock(uni('VERIFIED')), null)
        assert.strictEqual(universityLoginBlock({ role: 'UNIVERSITY_REP', isActive: true, university: null }), null)
    })

    await t.test('unknown emails and non-university roles are refused (no student account gets created)', () => {
        assert.strictEqual(universityLoginBlock(null), 'NoUniversityAccount')
        assert.strictEqual(universityLoginBlock({ role: 'STUDENT', isActive: true, university: null }), 'NoUniversityAccount')
        assert.strictEqual(universityLoginBlock({ role: 'ADMIN', isActive: true, university: null }), 'NoUniversityAccount')
    })

    await t.test('deactivated accounts are refused', () => {
        assert.strictEqual(universityLoginBlock(uni('VERIFIED', false)), 'AccountDeactivated')
    })

    await t.test('unverified universities are refused', () => {
        assert.strictEqual(universityLoginBlock(uni('PENDING')), 'PendingVerification')
        assert.strictEqual(universityLoginBlock(uni('REJECTED')), 'PendingVerification')
        assert.strictEqual(universityLoginBlock({ role: 'UNIVERSITY', isActive: true, university: null }), 'PendingVerification')
    })
})

test('isUniversityIntent', () => {
    assert.strictEqual(isUniversityIntent('https://edumeetup.com/university-login'), true)
    assert.strictEqual(isUniversityIntent('https://edumeetup.com/university/dashboard'), true)
    assert.strictEqual(isUniversityIntent('/university/dashboard'), true)
    assert.strictEqual(isUniversityIntent('https://edumeetup.com/universities'), false)
    assert.strictEqual(isUniversityIntent('https://edumeetup.com/login'), false)
    assert.strictEqual(isUniversityIntent('/student/dashboard'), false)
    assert.strictEqual(isUniversityIntent(undefined), false)
})
