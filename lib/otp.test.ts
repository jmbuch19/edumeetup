
import { describe, it, expect, vi } from 'vitest'
import { generateOTP } from './otp'
import * as crypto from 'crypto'

// Mocking crypto module to spy on randomInt and control its output
vi.mock('crypto', async () => {
    const actual = await vi.importActual<typeof import('crypto')>('crypto')
    return {
        ...actual,
        randomInt: vi.fn().mockReturnValue(123456),
    }
})

describe('generateOTP', () => {
    it('should return a string', () => {
        const otp = generateOTP()
        expect(typeof otp).toBe('string')
    })

    it('should be exactly 6 characters long', () => {
        const otp = generateOTP()
        expect(otp).toHaveLength(6)
    })

    it('should contain only digits', () => {
        const otp = generateOTP()
        expect(otp).toMatch(/^\d+$/)
    })

    it('should call randomInt with correct range to include 999999', () => {
        // Clear previous calls
        vi.mocked(crypto.randomInt).mockClear()

        generateOTP()

        // randomInt max is exclusive, so to get up to 999999, max must be 1000000
        expect(crypto.randomInt).toHaveBeenCalledWith(100000, 1000000)
    })
})
