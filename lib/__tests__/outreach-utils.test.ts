import * as assert from 'node:assert'
import { test } from 'node:test'
import { maskScore, maskName } from '../outreach-utils'

// To run this: npx tsx lib/__tests__/outreach-utils.test.ts

test('Outreach Utils - maskScore', async (t) => {
    await t.test('IELTS Edge Cases (Nearest 0.5)', () => {
        assert.strictEqual(maskScore('7.1', 'IELTS'), 'IELTS ~7')
        assert.strictEqual(maskScore('7.4', 'IELTS'), 'IELTS ~7.5')
        assert.strictEqual(maskScore('7.6', 'IELTS'), 'IELTS ~7.5')
        assert.strictEqual(maskScore('7.8', 'IELTS'), 'IELTS ~8')
        assert.strictEqual(maskScore('6', 'IELTS Academic'), 'IELTS Academic ~6')
    })
    await t.test('TOEFL Edge Cases (Nearest 0.5)', () => {
        assert.strictEqual(maskScore('103', 'TOEFL'), 'TOEFL ~103') 
        assert.strictEqual(maskScore('102.5', 'TOEFL iBT'), 'TOEFL iBT ~102.5')
    })
    await t.test('Other Tests (Nearest 10s)', () => {
        assert.strictEqual(maskScore('125', 'DET'), 'DET ~130')
        assert.strictEqual(maskScore('124', 'DET'), 'DET ~120')
        assert.strictEqual(maskScore('68', 'PTE'), 'PTE ~70')
        assert.strictEqual(maskScore('63', 'PTE'), 'PTE ~60')
    })
    await t.test('Non-numeric Fallbacks', () => {
        assert.strictEqual(maskScore('Pending', 'IELTS'), 'IELTS Pending')
        assert.strictEqual(maskScore('N/A', 'DET'), 'DET N/A')
    })
    await t.test('Empty or Null Checks', () => {
        assert.strictEqual(maskScore(null, 'IELTS'), '')
        assert.strictEqual(maskScore(undefined, 'IELTS'), '')
        assert.strictEqual(maskScore('', 'IELTS'), '')
        assert.strictEqual(maskScore('7.5', null), '')
        assert.strictEqual(maskScore('7.5', undefined), '')
        assert.strictEqual(maskScore('7.5', ''), '')
    })
})

test('Outreach Utils - maskName', async (t) => {
    await t.test('Null or Undefined Fallbacks', () => {
        assert.strictEqual(maskName(null), 'A student', 'Null should fallback to "A student"')
        assert.strictEqual(maskName(undefined), 'A student', 'Undefined should fallback to "A student"')
        assert.strictEqual(maskName(''), 'A student', 'Empty string should fallback to "A student"')
    })

    await t.test('Single Names', () => {
        assert.strictEqual(maskName('Alice'), 'Alice', 'Single names should be returned as-is')
        assert.strictEqual(maskName('Bob   '), 'Bob', 'Single names with trailing spaces should be properly trimmed')
        assert.strictEqual(maskName('   Charlie'), 'Charlie', 'Single names with leading spaces should be properly trimmed')
    })

    await t.test('Standard First and Last Names', () => {
        assert.strictEqual(maskName('John Doe'), 'John D.', 'Should compress last name to an initial')
        assert.strictEqual(maskName('Jane Smith'), 'Jane S.', 'Should compress last name to an initial')
    })

    await t.test('Multi-part Names (Middle Names)', () => {
        assert.strictEqual(maskName('John Jacob Jingleheimer Schmidt'), 'John S.', 'Should strip middle names entirely')
        assert.strictEqual(maskName('Mary Jane Watson'), 'Mary W.', 'Should handle 3 part names')
    })

    await t.test('Names with double spacing inside', () => {
        assert.strictEqual(maskName('Emma  Watson'), 'Emma W.', 'Should handle double spacing robustly')
    })
})
