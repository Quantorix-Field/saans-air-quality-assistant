// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  clientKey,
  errorResponse,
  jsonResponse,
  MAX_BODY_BYTES,
  methodGuard,
  rateGuard,
  readJsonBody,
} from '../../server/http.js';
import { createRateLimiter } from '../../server/rateLimit.js';

const post = (body: BodyInit | null, headers: Record<string, string> = { 'content-type': 'application/json' }): Request =>
  new Request('https://saans.test/api/x', { method: 'POST', headers, body });

describe('responses', () => {
  it('sends JSON that is never cached by default', async () => {
    const response = jsonResponse({ ok: true });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ ok: true });
  });

  it('allows a caching header to be set', () => {
    const response = jsonResponse({}, 200, { 'cache-control': 'public, s-maxage=600' });
    expect(response.headers.get('cache-control')).toBe('public, s-maxage=600');
  });

  it('error bodies hold a fixed code and message only', async () => {
    const response = errorResponse(400, 'invalid_request');
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_request', message: 'The request is not valid.' });
  });
});

describe('methodGuard', () => {
  it('passes the allowed method and rejects others with an Allow header', () => {
    expect(methodGuard(new Request('https://saans.test/', { method: 'GET' }), 'GET')).toBeNull();
    const rejected = methodGuard(new Request('https://saans.test/', { method: 'DELETE' }), 'POST');
    expect(rejected?.status).toBe(405);
    expect(rejected?.headers.get('allow')).toBe('POST');
  });
});

describe('clientKey and rateGuard', () => {
  it('prefers the Vercel header, then x-forwarded-for, then x-real-ip', () => {
    const make = (headers: Record<string, string>): Request => new Request('https://saans.test/', { headers });
    expect(clientKey(make({ 'x-vercel-forwarded-for': '1.1.1.1', 'x-forwarded-for': '2.2.2.2' }))).toBe('1.1.1.1');
    expect(clientKey(make({ 'x-forwarded-for': '2.2.2.2, 3.3.3.3' }))).toBe('2.2.2.2');
    expect(clientKey(make({ 'x-real-ip': '4.4.4.4' }))).toBe('4.4.4.4');
    expect(clientKey(make({}))).toBe('unknown');
  });

  it('answers 429 with Retry-After once the limit is passed', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: () => 0 });
    const request = new Request('https://saans.test/', { headers: { 'x-forwarded-for': '9.9.9.9' } });
    expect(rateGuard(request, limiter)).toBeNull();
    const blocked = rateGuard(request, limiter);
    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get('retry-after')).toBe('60');
  });
});

describe('readJsonBody', () => {
  it('reads valid JSON, including a charset parameter', async () => {
    const result = await readJsonBody(post('{"a":1}', { 'content-type': 'application/json; charset=utf-8' }));
    expect(result).toEqual({ ok: true, value: { a: 1 } });
  });

  it('rejects other content types with 415', async () => {
    const result = await readJsonBody(post('{}', { 'content-type': 'text/plain' }));
    expect(result.ok ? 0 : result.response.status).toBe(415);
    const missing = await readJsonBody(post('{}', {}));
    expect(missing.ok ? 0 : missing.response.status).toBe(415);
  });

  it('rejects a declared length over the limit with 413', async () => {
    const result = await readJsonBody(
      post('{}', { 'content-type': 'application/json', 'content-length': String(MAX_BODY_BYTES + 1) }),
    );
    expect(result.ok ? 0 : result.response.status).toBe(413);
  });

  it('rejects a body that is too large even without a length header', async () => {
    const big = JSON.stringify({ text: 'x'.repeat(MAX_BODY_BYTES) });
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(big));
        controller.close();
      },
    });
    const request = new Request('https://saans.test/api/x', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: stream,
      duplex: 'half',
    } as RequestInit);
    const result = await readJsonBody(request);
    expect(result.ok ? 0 : result.response.status).toBe(413);
  });

  it('accepts a body split into several chunks', async () => {
    const parts = ['{"a":', '"b', 'c"}'].map((part) => new TextEncoder().encode(part));
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        parts.forEach((part) => controller.enqueue(part));
        controller.close();
      },
    });
    const request = new Request('https://saans.test/api/x', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: stream,
      duplex: 'half',
    } as RequestInit);
    expect(await readJsonBody(request)).toEqual({ ok: true, value: { a: 'bc' } });
  });

  it('rejects invalid JSON, invalid UTF-8 and an empty body with 400', async () => {
    const bad = await readJsonBody(post('{nope'));
    expect(bad.ok ? 0 : bad.response.status).toBe(400);
    const utf = await readJsonBody(post(new Uint8Array([0xff, 0xfe, 0xfd])));
    expect(utf.ok ? 0 : utf.response.status).toBe(400);
    const empty = await readJsonBody(new Request('https://saans.test/', { method: 'POST', headers: { 'content-type': 'application/json' } }));
    expect(empty.ok ? 0 : empty.response.status).toBe(400);
  });
});
