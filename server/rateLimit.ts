export interface RateResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface RateLimiter {
  check(key: string): RateResult;
}

export interface RateLimiterOptions {
  limit: number;
  windowMs: number;
  /** Upper bound on remembered clients so memory stays small under a flood. */
  maxKeys?: number;
  now?: () => number;
}

interface Slot {
  start: number;
  count: number;
}

/**
 * Fixed-window counter held in memory. On serverless hosting each warm instance keeps its own
 * counter, so this limits bursts per instance rather than globally. SECURITY.md documents this.
 */
export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const { limit, windowMs, maxKeys = 5000, now = Date.now } = options;
  const slots = new Map<string, Slot>();

  function makeRoom(time: number): void {
    for (const [key, slot] of slots) {
      if (time - slot.start >= windowMs) slots.delete(key);
    }
    const oldest = slots.keys().next();
    if (slots.size >= maxKeys && !oldest.done) slots.delete(oldest.value);
  }

  return {
    check(key: string): RateResult {
      const time = now();
      const slot = slots.get(key);
      if (!slot || time - slot.start >= windowMs) {
        if (!slot && slots.size >= maxKeys) makeRoom(time);
        slots.set(key, { start: time, count: 1 });
        return { allowed: true, retryAfterSeconds: 0 };
      }
      slot.count += 1;
      if (slot.count <= limit) return { allowed: true, retryAfterSeconds: 0 };
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((slot.start + windowMs - time) / 1000)) };
    },
  };
}
