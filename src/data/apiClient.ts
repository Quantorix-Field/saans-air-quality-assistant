import type { z } from 'zod';

export type ApiErrorKind = 'network' | 'rate_limited' | 'server' | 'invalid';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  constructor(kind: ApiErrorKind, message: string) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
  }
}

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

interface InFlightEntry {
  promise: Promise<unknown>;
}

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, InFlightEntry>();

let nowFn: () => number = () => Date.now();

export function setNowFn(fn: () => number): void {
  nowFn = fn;
}

export function clearApiCache(): void {
  cache.clear();
  inFlight.clear();
}

const TTL_AIR = 10 * 60 * 1000;
const TTL_GEOCODE = 60 * 60 * 1000;
const REQUEST_TIMEOUT = 12_000;

function getTtl(url: string): number {
  if (url.includes('/api/geocode')) return TTL_GEOCODE;
  return TTL_AIR;
}

function chainAbort(caller: AbortSignal | undefined): AbortController {
  const internal = new AbortController();

  const timeoutId = setTimeout(() => internal.abort(new Error('timeout')), REQUEST_TIMEOUT);

  if (caller) {
    if (caller.aborted) {
      clearTimeout(timeoutId);
      internal.abort(caller.reason as Error);
    } else {
      const onAbort = () => {
        clearTimeout(timeoutId);
        internal.abort(caller.reason as Error);
      };
      caller.addEventListener('abort', onAbort, { once: true });
      internal.signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        caller.removeEventListener('abort', onAbort);
      }, { once: true });
    }
  }

  // Clean up timeout when request completes
  internal.signal.addEventListener('abort', () => clearTimeout(timeoutId), { once: true });

  return internal;
}

function isAbortFromCaller(err: unknown, callerSignal: AbortSignal | undefined): boolean {
  if (!callerSignal?.aborted) return false;
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  if (err instanceof Error && err.name === 'AbortError') return true;
  return false;
}

async function doFetch<T>(
  url: string,
  init: RequestInit | undefined,
  schema: z.ZodType<T>,
  callerSignal: AbortSignal | undefined,
): Promise<T> {
  const internal = chainAbort(callerSignal);

  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: internal.signal });
  } catch (err: unknown) {
    if (isAbortFromCaller(err, callerSignal)) throw err;
    if (internal.signal.aborted) {
      throw new ApiError('network', 'Request timed out');
    }
    throw new ApiError('network', 'Network request failed');
  }

  if (res.status === 429) throw new ApiError('rate_limited', 'Rate limited');
  if (res.status >= 500 || !res.ok) {
    throw new ApiError('server', `Server error: ${String(res.status)}`);
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new ApiError('invalid', 'Invalid JSON response');
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ApiError('invalid', 'Response validation failed');
  }
  return result.data;
}

export async function requestJson<T>(
  url: string,
  init: RequestInit | undefined,
  schema: z.ZodType<T>,
  signal?: AbortSignal,
): Promise<T> {
  const method = init?.method?.toUpperCase() ?? 'GET';
  const isGet = method === 'GET';

  // Only cache GETs
  if (isGet) {
    const cached = cache.get(url);
    if (cached && nowFn() < cached.expiresAt) {
      return cached.data as T;
    }

    // In-flight dedupe
    const existing = inFlight.get(url);
    if (existing) {
      return existing.promise as Promise<T>;
    }

    const promise = doFetch(url, init, schema, signal).then((data) => {
      cache.set(url, { data, expiresAt: nowFn() + getTtl(url) });
      inFlight.delete(url);
      return data;
    }).catch((err: unknown) => {
      inFlight.delete(url);
      throw err;
    });

    inFlight.set(url, { promise });
    return promise;
  }

  return doFetch(url, init, schema, signal);
}
