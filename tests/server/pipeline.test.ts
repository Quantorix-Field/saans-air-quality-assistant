// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { guardRequest, parseBody, loadBundle, parseAiJson, tryGemini } from '../../server/pipeline.js';
import { createRateLimiter } from '../../server/rateLimit.js';
import { RAW_AIR_UPSTREAM, SAMPLE_AIR, BASE_PROFILE, makeAirFetch } from './fixtures.js';
import { geminiConfig } from '../../server/gemini.js';
import { buildAdvice } from '../../shared/domain/advice.js';

// ── guardRequest ────────────────────────────────────────────────────────────

describe('guardRequest', () => {
  const limiter = createRateLimiter({ limit: 20, windowMs: 60000 });

  it('returns null when method and rate are ok', () => {
    const req = new Request('https://t.test/', { method: 'GET' });
    expect(guardRequest(req, 'GET', limiter)).toBeNull();
  });

  it('returns 405 for wrong method before rate limit', () => {
    const req = new Request('https://t.test/', { method: 'POST' });
    const res = guardRequest(req, 'GET', limiter);
    expect(res?.status).toBe(405);
  });

  it('returns 429 when rate limit is exceeded', async () => {
    const tightLimiter = createRateLimiter({ limit: 1, windowMs: 60000 });
    const hdr = { headers: { 'x-forwarded-for': '9.9.9.9' } };
    guardRequest(new Request('https://t.test/', { method: 'GET', ...hdr }), 'GET', tightLimiter);
    const res = guardRequest(new Request('https://t.test/', { method: 'GET', ...hdr }), 'GET', tightLimiter);
    expect(res?.status).toBe(429);
  });
});

// ── parseBody ───────────────────────────────────────────────────────────────

describe('parseBody', () => {
  const schema = z.object({ name: z.string() }).strict();

  function postJson(body: unknown): Request {
    return new Request('https://t.test/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('returns ok:true with valid body', async () => {
    const result = await parseBody(postJson({ name: 'Delhi' }), schema);
    expect(result).toMatchObject({ ok: true, value: { name: 'Delhi' } });
  });

  it('returns 400 for schema mismatch', async () => {
    const result = await parseBody(postJson({ name: 123 }), schema);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(400);
  });

  it('returns 415 for wrong content-type', async () => {
    const req = new Request('https://t.test/', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' });
    const result = await parseBody(req, schema);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(415);
  });

  it('returns 413 for declared body over 8 KB', async () => {
    const req = new Request('https://t.test/', { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': '9000' }, body: '{}' });
    const result = await parseBody(req, schema);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(413);
  });

  it('returns 400 for extra unknown fields (strict schema)', async () => {
    const result = await parseBody(postJson({ name: 'Delhi', extra: true }), schema);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(400);
  });
});

// ── loadBundle ──────────────────────────────────────────────────────────────

describe('loadBundle', () => {
  const profile = { ...BASE_PROFILE, language: 'en' as const };
  const now = () => Date.parse('2026-01-15T08:00:00Z');

  it('returns ok:true with valid air data', async () => {
    const result = await loadBundle(28.61, 77.21, profile, { fetch: makeAirFetch(), now });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.bundle).toBeDefined();
      expect(result.air.nowIndex).toBeGreaterThanOrEqual(0);
    }
  });

  it('returns 502 when upstream returns non-ok status (UpstreamError)', async () => {
    const failFetch = vi.fn(() => Promise.resolve(new Response('err', { status: 503 })));
    const result = await loadBundle(28.61, 77.21, profile, { fetch: failFetch, now });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(502);
  });

  it('returns 502 when network throws (non-UpstreamError)', async () => {
    const failFetch = vi.fn(() => Promise.reject(new Error('network gone')));
    const result = await loadBundle(28.61, 77.21, profile, { fetch: failFetch, now });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(502);
  });

  it('returns 502 when buildAdvice returns null (no particulate data)', async () => {
    // Strip all pm2_5 and pm10 values to null to force buildAdvice to return null
    const noParticulateData = {
      ...RAW_AIR_UPSTREAM,
      hourly: { ...RAW_AIR_UPSTREAM.hourly, pm2_5: Array(48).fill(null), pm10: Array(48).fill(null) },
    };
    const result = await loadBundle(28.61, 77.21, profile, { fetch: makeAirFetch(noParticulateData), now });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(502);
  });
});

// ── parseAiJson ─────────────────────────────────────────────────────────────

describe('parseAiJson', () => {
  const schema = z.object({ summary: z.string(), tips: z.array(z.string()) });
  // Build real facts via buildAdvice so the numberGuard allowed-set is realistic
  const bundle = buildAdvice(SAMPLE_AIR, { ...BASE_PROFILE, language: 'en' }, 0.5);
  const facts = bundle!.facts;

  const parse = parseAiJson(schema, (d) => [d.summary, ...d.tips].join('\n'), facts);

  it('returns parsed data for a valid AI response with numbers from facts', () => {
    const aqi = facts.airQualityIndex;
    const result = parse(JSON.stringify({ summary: `AQI is ${aqi}.`, tips: [] }));
    expect(result).toMatchObject({ summary: `AQI is ${aqi}.` });
  });

  it('returns null for non-JSON input', () => {
    expect(parse('not json')).toBeNull();
  });

  it('returns null when schema validation fails', () => {
    expect(parse(JSON.stringify({ summary: 123, tips: [] }))).toBeNull();
  });

  it('returns null when AI answer contains a fake number (numberGuard)', () => {
    const result = parse(JSON.stringify({ summary: 'AQI is 99999 which is catastrophic.', tips: [] }));
    expect(result).toBeNull();
  });

  it('allows small integers (≤ 12) regardless of facts', () => {
    const result = parse(JSON.stringify({ summary: 'Take 3 steps.', tips: [] }));
    expect(result).not.toBeNull();
  });
});

// ── tryGemini ───────────────────────────────────────────────────────────────

describe('tryGemini', () => {
  const cfg = geminiConfig({ GEMINI_API_KEY: 'test-key' });
  const now = () => Date.parse('2026-01-15T08:00:00Z');
  const limits = { attemptMs: 5000, totalMs: 10000 };
  const request = { system: 'You are helpful.', contents: [{ role: 'user', parts: [{ text: 'hi' }] }], schema: {} };

  it('returns parsed value on a good Gemini response', async () => {
    const geminiBody = { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ answer: 42 }) }] } }] };
    const mockFetch = vi.fn(() => Promise.resolve(new Response(JSON.stringify(geminiBody), { status: 200 })));
    const parse = (text: string): { answer: number } | null => {
      try { return JSON.parse(text) as { answer: number }; } catch { return null; }
    };
    const result = await tryGemini({ fetch: mockFetch, now, config: cfg! }, request, parse, limits);
    expect(result).toMatchObject({ answer: 42 });
  });

  it('returns null when Gemini returns non-ok status', async () => {
    const mockFetch = vi.fn(() => Promise.resolve(new Response('err', { status: 503 })));
    const result = await tryGemini({ fetch: mockFetch, now, config: cfg! }, request, (_t) => null, limits);
    expect(result).toBeNull();
  });

  it('returns null when parse function rejects the response', async () => {
    const geminiBody = { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'bad json' }] } }] };
    const mockFetch = vi.fn(() => Promise.resolve(new Response(JSON.stringify(geminiBody), { status: 200 })));
    const result = await tryGemini({ fetch: mockFetch, now, config: cfg! }, request, (_t) => null, limits);
    expect(result).toBeNull();
  });

  it('returns null when network throws', async () => {
    const mockFetch = vi.fn(() => Promise.reject(new Error('timeout')));
    const result = await tryGemini({ fetch: mockFetch, now, config: cfg! }, request, (_t) => ({ ok: true }), limits);
    expect(result).toBeNull();
  });
});
