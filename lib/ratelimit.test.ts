import { test, describe } from 'node:test';
import assert from 'node:assert';
import { RateLimiter } from './ratelimit.ts';

describe('RateLimiter', () => {
    test('should allow requests within the limit', () => {
        const limiter = new RateLimiter(1000, 2);
        assert.strictEqual(limiter.check('user1'), true);
        assert.strictEqual(limiter.check('user1'), true);
    });

    test('should block requests exceeding the limit', () => {
        const limiter = new RateLimiter(1000, 2);
        assert.strictEqual(limiter.check('user1'), true);
        assert.strictEqual(limiter.check('user1'), true);
        assert.strictEqual(limiter.check('user1'), false);
    });

    test('should allow requests again after the window expires', (t) => {
        t.mock.timers.enable({ apis: ['Date'] });
        const limiter = new RateLimiter(1000, 2);

        assert.strictEqual(limiter.check('user1'), true);
        assert.strictEqual(limiter.check('user1'), true);
        assert.strictEqual(limiter.check('user1'), false);

        t.mock.timers.tick(1001);

        assert.strictEqual(limiter.check('user1'), true);
    });

    test('should maintain independent limits for different keys', () => {
        const limiter = new RateLimiter(1000, 1);
        assert.strictEqual(limiter.check('user1'), true);
        assert.strictEqual(limiter.check('user1'), false);
        assert.strictEqual(limiter.check('user2'), true);
        assert.strictEqual(limiter.check('user2'), false);
    });

    test('should handle multiple windows correctly', (t) => {
        t.mock.timers.enable({ apis: ['Date'] });
        const limiter = new RateLimiter(1000, 2);

        // First window
        assert.strictEqual(limiter.check('user1'), true);
        t.mock.timers.tick(500);
        assert.strictEqual(limiter.check('user1'), true);
        assert.strictEqual(limiter.check('user1'), false);

        // Tick to 1100, first request should be out of window, but second still in
        t.mock.timers.tick(600);
        // Now at 1100. First req was at 0. Second req was at 500.
        // 1100 - 0 = 1100 > 1000 (out)
        // 1100 - 500 = 600 < 1000 (in)
        // One request still in window, so we can make one more.
        assert.strictEqual(limiter.check('user1'), true);
        assert.strictEqual(limiter.check('user1'), false);

        // Tick to 1600. Second request (at 500) should be out.
        t.mock.timers.tick(500);
        // 1600 - 500 = 1100 > 1000 (out)
        // 1600 - 1100 = 500 < 1000 (in)
        // One request (at 1100) still in window.
        assert.strictEqual(limiter.check('user1'), true);
        assert.strictEqual(limiter.check('user1'), false);
    });
});
