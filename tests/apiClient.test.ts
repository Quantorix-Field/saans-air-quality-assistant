import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { z } from 'zod';
import {
  ApiError,
  requestJson,
  clearApiCache,
  setNowFn,
} from '../src/data/apiClient.js';

const TestSchema = z.object({ value: z.number() });

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('apiClient', () => {
  let now = 0;

  beforeEach(() => {
    now = 1000000;
    setNowFn(() => now);
    clearApiCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    setNowFn(() => Date.now());
    clearApiCache();
  });

  it('returns parsed data on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => Promise.resolve(jsonResponse({ value: 42 })),
    );
    const result = await requestJson('/api/air?lat=1&lon=2', undefined, TestSchema);
    expect(result).toEqual({ value: 42 });
  });

  it('maps fetch failure to network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => Promise.reject(new TypeError('Failed to fetch')),
    );
    try {
      await requestJson('/test', undefined, TestSchema);
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).kind).toBe('network');
    }
  });

  it('maps 429 to rate_limited', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => Promise.resolve(jsonResponse({}, 429)),
    );
    try {
      await requestJson('/test-429', undefined, TestSchema);
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).kind).toBe('rate_limited');
    }
  });

  it('maps 500 to server error', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => Promise.resolve(jsonResponse({}, 500)),
    );
    try {
      await requestJson('/test-500', undefined, TestSchema);
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).kind).toBe('server');
    }
  });

  it('maps 403 to server error', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => Promise.resolve(jsonResponse({}, 403)),
    );
    try {
      await requestJson('/test-403', undefined, TestSchema);
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).kind).toBe('server');
    }
  });

  it('maps schema failure to invalid', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => Promise.resolve(jsonResponse({ wrong: 'shape' })),
    );
    try {
      await requestJson('/test-schema', undefined, TestSchema);
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).kind).toBe('invalid');
    }
  });

  it('maps invalid JSON to invalid', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => Promise.resolve(new Response('not json', { status: 200 })),
    );
    try {
      await requestJson('/test-json', undefined, TestSchema);
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).kind).toBe('invalid');
    }
  });

  it('timeout triggers network error', async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          const opts = init as RequestInit | undefined;
          opts?.signal?.addEventListener('abort', () => {
            reject(new DOMException('aborted', 'AbortError'));
          });
        }),
    );

    const promise = requestJson('/test-timeout', undefined, TestSchema);
    vi.advanceTimersByTime(13000);
    await expect(promise).rejects.toThrow(ApiError);
    try {
      await promise;
    } catch (e) {
      expect((e as ApiError).kind).toBe('network');
    }
    vi.useRealTimers();
  });

  it('caller abort propagates as AbortError, not ApiError', async () => {
    const controller = new AbortController();
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          const opts = init as RequestInit | undefined;
          opts?.signal?.addEventListener('abort', () => {
            reject(new DOMException('aborted', 'AbortError'));
          });
        }),
    );

    const promise = requestJson('/test-abort', undefined, TestSchema, controller.signal);
    controller.abort();
    await expect(promise).rejects.toThrow();
    try {
      await promise;
    } catch (e) {
      expect(e).not.toBeInstanceOf(ApiError);
      expect((e as DOMException).name).toBe('AbortError');
    }
  });

  it('GET cache hit returns cached data', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => Promise.resolve(jsonResponse({ value: 1 })),
    );
    await requestJson('/api/air?lat=1&lon=1', undefined, TestSchema);
    const result = await requestJson('/api/air?lat=1&lon=1', undefined, TestSchema);
    expect(result).toEqual({ value: 1 });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('cache expires after TTL', async () => {
    let call = 0;
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      call++;
      return Promise.resolve(jsonResponse({ value: call }));
    });

    await requestJson('/api/air?lat=2&lon=2', undefined, TestSchema);
    // Advance past 10-minute TTL
    now += 11 * 60 * 1000;
    const result = await requestJson('/api/air?lat=2&lon=2', undefined, TestSchema);
    expect(result).toEqual({ value: 2 });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('geocode cache uses 1-hour TTL', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => Promise.resolve(jsonResponse({ value: 1 })),
    );

    await requestJson('/api/geocode?q=delhi', undefined, TestSchema);

    // After 30 min, still cached
    now += 30 * 60 * 1000;
    await requestJson('/api/geocode?q=delhi', undefined, TestSchema);
    expect(spy).toHaveBeenCalledTimes(1);

    // After 61 min total, expired
    now += 31 * 60 * 1000;
    await requestJson('/api/geocode?q=delhi', undefined, TestSchema);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('in-flight dedupe – concurrent identical GETs share one fetch', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => Promise.resolve(jsonResponse({ value: 7 })),
    );

    const [a, b] = await Promise.all([
      requestJson('/api/air?lat=3&lon=3', undefined, TestSchema),
      requestJson('/api/air?lat=3&lon=3', undefined, TestSchema),
    ]);
    expect(a).toEqual({ value: 7 });
    expect(b).toEqual({ value: 7 });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('POST requests are not cached', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => Promise.resolve(jsonResponse({ value: 1 })),
    );

    await requestJson('/api/advice', { method: 'POST', body: '{}' }, TestSchema);
    await requestJson('/api/advice', { method: 'POST', body: '{}' }, TestSchema);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
