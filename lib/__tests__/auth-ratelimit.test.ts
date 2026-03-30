import * as assert from 'node:assert'
import { test, describe, afterEach, beforeEach } from 'node:test'
import { isRateLimited, getRateLimitResetSeconds } from '../auth'

// To run this: AUTH_SECRET="test" npx tsx lib/__tests__/auth-ratelimit.test.ts

const originalDateNow = Date.now

describe('In-Memory Rate Limiter', () => {
    let mockTime = 1000

    beforeEach(() => {
        // Mock time
        Date.now = () => mockTime
    })

    afterEach(() => {
        // Restore time
        Date.now = originalDateNow
    })

    test('Should allow up to exactly 3 requests in the time window', () => {
        const email = 'test1@example.com'
        
        // Request 1
        assert.strictEqual(isRateLimited(email), false, 'First request should be allowed')
        
        // Request 2
        assert.strictEqual(isRateLimited(email), false, 'Second request should be allowed')
        
        // Request 3
        assert.strictEqual(isRateLimited(email), false, 'Third request should be allowed')
        
        // Request 4 (Blocked)
        assert.strictEqual(isRateLimited(email), true, 'Fourth request should be blocked!')
        
        // Request 5 (Still Blocked)
        assert.strictEqual(isRateLimited(email), true, 'Fifth request should remain blocked!')
    })

    test('Should reset fully after the 10 minute window expires', () => {
        const email = 'test2@example.com'
        const TEN_MINUTES_MS = 10 * 60 * 1000

        // Exhaust the limit
        isRateLimited(email); isRateLimited(email); isRateLimited(email)
        assert.strictEqual(isRateLimited(email), true, 'Should be throttled currently')

        // Fast-forward time to exactly 10 minutes (still blocked unless > threshold depending on exact operator)
        // Code uses: now - record.start > RATE_LIMIT_WINDOW
        mockTime += TEN_MINUTES_MS
        assert.strictEqual(isRateLimited(email), true, 'Should still be blocked at exactly the borderline')

        // Fast-forward 1 more millisecond to explicitly pass the threshold
        mockTime += 1
        assert.strictEqual(isRateLimited(email), false, 'Should be unblocked after time window naturally expires')
        
        // Verify it reset the counter (can perform 2 more queries before blocking)
        assert.strictEqual(isRateLimited(email), false, 'Second request of new window should be allowed')
        assert.strictEqual(isRateLimited(email), false, 'Third request of new window should be allowed')
        assert.strictEqual(isRateLimited(email), true, 'Fourth request of new window should block again')
    })

    test('getRateLimitResetSeconds helper', () => {
        const email = 'test3@example.com'
        const TEN_MINUTES_MS = 10 * 60 * 1000
        mockTime = 50000 // Arbitrary start time

        // No record yet
        assert.strictEqual(getRateLimitResetSeconds(email), 0, 'No record means 0 reset time')

        // Create record
        isRateLimited(email)

        // It should take 10 minutes to reset
        assert.strictEqual(getRateLimitResetSeconds(email), 600, 'Immediately after, reset is 600 seconds')

        // Fast forward 3 minutes
        mockTime += 3 * 60 * 1000 
        assert.strictEqual(getRateLimitResetSeconds(email), 420, 'After 3 minutes, 7 minutes (420s) remain')

        // Fast forward past window
        mockTime += 15 * 60 * 1000
        assert.strictEqual(getRateLimitResetSeconds(email), 0, 'If expired, remaining time should safely clamp to 0')
    })
})
