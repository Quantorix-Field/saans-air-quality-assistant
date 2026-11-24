import type { RateLimiter } from './rateLimit.js';

export const MAX_BODY_BYTES = 8192;

export type ErrorCode =
  | 'method_not_allowed'
  | 'unsupported_media_type'
  | 'payload_too_large'
  | 'invalid_request'
  | 'rate_limited'
  | 'upstream_unavailable';

const MESSAGES: Record<ErrorCode, string> = {
  method_not_allowed: 'Method not allowed.',
  unsupported_media_type: 'Send application/json.',
  payload_too_large: 'Request body is too large.',
  invalid_request: 'The request is not valid.',
  rate_limited: 'Too many requests. Try again shortly.',
  upstream_unavailable: 'Data is temporarily unavailable.',
};

const BASE_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } as const;

export function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...BASE_HEADERS, ...headers } });
}

/** Errors carry a fixed code and message only: never user input, coordinates or upstream details. */
export function errorResponse(status: number, code: ErrorCode, headers: Record<string, string> = {}): Response {
  return jsonResponse({ error: code, message: MESSAGES[code] }, status, headers);
}

export function methodGuard(request: Request, allowed: 'GET' | 'POST'): Response | null {
  return request.method === allowed ? null : errorResponse(405, 'method_not_allowed', { allow: allowed });
}

/** Vercel sets x-vercel-forwarded-for itself; other proxies fall back to x-forwarded-for. */
export function clientKey(request: Request): string {
  const forwarded =
    request.headers.get('x-vercel-forwarded-for') ?? request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip');
  return forwarded?.split(',')[0]?.trim().slice(0, 64) || 'unknown';
}

export function rateGuard(request: Request, limiter: RateLimiter): Response | null {
  const result = limiter.check(clientKey(request));
  return result.allowed ? null : errorResponse(429, 'rate_limited', { 'retry-after': String(result.retryAfterSeconds) });
}

export type BodyResult = { ok: true; value: unknown } | { ok: false; response: Response };

async function readLimited(request: Request): Promise<Uint8Array | null> {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array(0);
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return joined;
}

/** application/json only, at most 8 KB (checked while reading), valid UTF-8 and valid JSON. */
export async function readJsonBody(request: Request): Promise<BodyResult> {
  const type = request.headers.get('content-type') ?? '';
  if (!/^application\/json\s*(?:;.*)?$/i.test(type)) {
    return { ok: false, response: errorResponse(415, 'unsupported_media_type') };
  }
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY_BYTES) return { ok: false, response: errorResponse(413, 'payload_too_large') };
  const bytes = await readLimited(request);
  if (bytes === null) return { ok: false, response: errorResponse(413, 'payload_too_large') };
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, response: errorResponse(400, 'invalid_request') };
  }
}
