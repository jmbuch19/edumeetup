import { RateLimiter } from './ratelimit';

describe('RateLimiter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should allow requests within limit', () => {
    const limiter = new RateLimiter(1000, 2);
    expect(limiter.check('user1')).toBe(true);
    expect(limiter.check('user1')).toBe(true);
  });

  test('should block requests exceeding limit', () => {
    const limiter = new RateLimiter(1000, 2);
    limiter.check('user1');
    limiter.check('user1');
    expect(limiter.check('user1')).toBe(false);
  });

  test('should reset limit after window expires', () => {
    const limiter = new RateLimiter(1000, 2);
    limiter.check('user1');
    limiter.check('user1');
    expect(limiter.check('user1')).toBe(false);

    jest.advanceTimersByTime(1001);

    expect(limiter.check('user1')).toBe(true);
  });

  test('should handle independent keys', () => {
    const limiter = new RateLimiter(1000, 2);
    limiter.check('user1');
    limiter.check('user1');
    expect(limiter.check('user1')).toBe(false);

    expect(limiter.check('user2')).toBe(true);
    expect(limiter.check('user2')).toBe(true);
    expect(limiter.check('user2')).toBe(false);
  });
});
