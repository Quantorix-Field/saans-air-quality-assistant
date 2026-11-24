// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createRateLimiter } from '../../server/rateLimit.js';

describe('createRateLimiter', () => {
  it('allows up to the limit and then blocks with a retry time', () => {
    let time = 1_000;
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000, now: () => time });
    expect(limiter.check('a').allowed).toBe(true);
    expect(limiter.check('a').allowed).toBe(true);
    expect(limiter.check('a').allowed).toBe(true);
    time = 31_000;
    const blocked = limiter.check('a');
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(30);
  });

  it('counts each client separately', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: () => 0 });
    expect(limiter.check('a').allowed).toBe(true);
    expect(limiter.check('b').allowed).toBe(true);
    expect(limiter.check('a').allowed).toBe(false);
  });

  it('starts a new window after the old one ends', () => {
    let time = 0;
    const limiter = createRateLimiter({ limit: 1, windowMs: 1_000, now: () => time });
    limiter.check('a');
    expect(limiter.check('a').allowed).toBe(false);
    time = 1_000;
    expect(limiter.check('a').allowed).toBe(true);
  });

  it('forgets clients when the table is full, so memory stays bounded', () => {
    let time = 0;
    const limiter = createRateLimiter({ limit: 1, windowMs: 1_000, maxKeys: 2, now: () => time });
    limiter.check('a');
    limiter.check('b');
    time = 2_000;
    expect(limiter.check('c').allowed).toBe(true);
    expect(limiter.check('a').allowed).toBe(true);
  });

  it('drops the oldest client when every entry is still current', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, maxKeys: 2, now: () => 5 });
    limiter.check('a');
    limiter.check('b');
    expect(limiter.check('c').allowed).toBe(true);
    expect(limiter.check('a').allowed).toBe(true);
    expect(limiter.check('c').allowed).toBe(false);
  });

  it('uses the real clock by default', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
    expect(limiter.check('x').allowed).toBe(true);
    expect(limiter.check('x').allowed).toBe(false);
  });
});
