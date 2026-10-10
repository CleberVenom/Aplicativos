/** @jest-environment node */
import { clientKey, RateLimiter } from './rate-limit';

describe('RateLimiter', () => {
  it('allows up to the limit within the window, per key', () => {
    let now = 0;
    const limiter = new RateLimiter(2, 1000, () => now);
    expect(limiter.take('a')).toBe(true);
    expect(limiter.take('a')).toBe(true);
    expect(limiter.take('a')).toBe(false);
    expect(limiter.take('b')).toBe(true);
    now = 1001;
    expect(limiter.take('a')).toBe(true);
  });
});

describe('clientKey', () => {
  it('uses the first forwarded address, then other proxy headers', () => {
    const req = (headers: Record<string, string>) => new Request('http://localhost/', { headers });
    expect(clientKey(req({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1' }))).toBe('203.0.113.5');
    expect(clientKey(req({ 'cf-connecting-ip': '198.51.100.2' }))).toBe('198.51.100.2');
    expect(clientKey(req({}))).toBe('local');
  });
});
