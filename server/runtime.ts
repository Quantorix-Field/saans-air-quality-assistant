import { createHandlers } from './handlers.js';
import { createRateLimiter } from './rateLimit.js';

export function createRuntimeHandlers(): ReturnType<typeof createHandlers> {
  return createHandlers({
    fetch: (input, init) => fetch(input, init),
    now: () => Date.now(),
    env: process.env as Record<string, string | undefined>,
    limiter: createRateLimiter({ limit: 20, windowMs: 60000 }),
  });
}
