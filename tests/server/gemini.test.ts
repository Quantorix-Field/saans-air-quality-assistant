// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { geminiConfig, generateStructured, DEFAULT_MODEL, DEFAULT_FALLBACKS, MIN_ATTEMPT_MS } from '../../server/gemini.js';
import type { GeminiConfig } from '../../server/gemini.js';

function makeGoodResponse(text: string): Response {
  return new Response(
    JSON.stringify({
      candidates: [
        {
          finishReason: 'STOP',
          content: { parts: [{ text }] },
        },
      ],
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

const SAMPLE_CONFIG: GeminiConfig = { key: 'test-key', models: ['gemini-3.8-flash', 'gemini-3.6-flash'] };

describe('geminiConfig', () => {
  it('returns null when GEMINI_API_KEY is missing', () => {
    expect(geminiConfig({})).toBeNull();
  });

  it('returns null when GEMINI_API_KEY is blank after trim', () => {
    expect(geminiConfig({ GEMINI_API_KEY: '   ' })).toBeNull();
  });

  it('uses DEFAULT_MODEL when GEMINI_MODEL is invalid', () => {
    const cfg = geminiConfig({ GEMINI_API_KEY: 'key', GEMINI_MODEL: '!!invalid!!' });
    expect(cfg?.models[0]).toBe(DEFAULT_MODEL);
  });

  it('uses GEMINI_MODEL when it matches the pattern', () => {
    const cfg = geminiConfig({ GEMINI_API_KEY: 'key', GEMINI_MODEL: 'gemini-2.0-flash' });
    expect(cfg?.models[0]).toBe('gemini-2.0-flash');
  });

  it('uses DEFAULT_FALLBACKS when GEMINI_FALLBACK_MODELS is empty', () => {
    const cfg = geminiConfig({ GEMINI_API_KEY: 'key' });
    expect(cfg?.models.slice(1)).toEqual(
      DEFAULT_FALLBACKS.filter((m) => m !== DEFAULT_MODEL),
    );
  });

  it('deduplicates fallback models', () => {
    const cfg = geminiConfig({
      GEMINI_API_KEY: 'key',
      GEMINI_FALLBACK_MODELS: 'gemini-3.6-flash,gemini-3.6-flash,gemini-2.0-flash',
    });
    const fallbacks = cfg?.models.slice(1) ?? [];
    expect(fallbacks.length).toBe(new Set(fallbacks).size);
  });

  it('drops invalid fallback model ids', () => {
    const cfg = geminiConfig({
      GEMINI_API_KEY: 'key',
      GEMINI_FALLBACK_MODELS: '!!bad!!,gemini-3.6-flash',
    });
    expect(cfg?.models).not.toContain('!!bad!!');
    expect(cfg?.models).toContain('gemini-3.6-flash');
  });

  it('limits fallbacks to 3 max', () => {
    const cfg = geminiConfig({
      GEMINI_API_KEY: 'key',
      GEMINI_FALLBACK_MODELS: 'gemini-a.b-flash,gemini-b.c-flash,gemini-c.d-flash,gemini-d.e-flash',
    });
    expect((cfg?.models.length ?? 0) - 1).toBeLessThanOrEqual(3);
  });

  it('excludes primary from fallbacks', () => {
    const cfg = geminiConfig({
      GEMINI_API_KEY: 'key',
      GEMINI_MODEL: 'gemini-3.6-flash',
      GEMINI_FALLBACK_MODELS: 'gemini-3.6-flash,gemini-2.0-flash',
    });
    expect(cfg?.models.filter((m) => m === 'gemini-3.6-flash')).toHaveLength(1);
  });
});

describe('generateStructured', () => {
  it('returns value and model on success, hits correct URL and uses api key header', async () => {
    const fetched: Array<{ url: string; key: string }> = [];
    const mockFetch = vi.fn((url: string, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string> | undefined;
      fetched.push({ url, key: headers?.['x-goog-api-key'] ?? '' });
      return Promise.resolve(makeGoodResponse('{"summary":"ok","tips":[]}'));
    });

    const result = await generateStructured(
      { fetch: mockFetch, now: Date.now, config: SAMPLE_CONFIG },
      { system: 'sys', contents: [], schema: {} },
      (text) => {
        try { return JSON.parse(text) as object; } catch { return null; }
      },
    );

    expect(result).not.toBeNull();
    expect(result?.model).toBe('gemini-3.8-flash');
    expect(fetched[0]?.url).toContain('gemini-3.8-flash');
    expect(fetched[0]?.key).toBe('test-key');
  });

  it('falls back to second model on first 503, tries both URLs in order', async () => {
    const urls: string[] = [];
    const mockFetch = vi.fn((url: string) => {
      urls.push(url);
      if (url.includes('gemini-3.8-flash')) {
        return Promise.resolve(new Response('error', { status: 503 }));
      }
      return Promise.resolve(makeGoodResponse('{"answer":"fallback ok"}'));
    });

    const result = await generateStructured(
      { fetch: mockFetch, now: Date.now, config: SAMPLE_CONFIG },
      { system: 'sys', contents: [], schema: {} },
      (text) => {
        try { return JSON.parse(text) as object; } catch { return null; }
      },
    );

    expect(result?.model).toBe('gemini-3.6-flash');
    expect(urls[0]).toContain('gemini-3.8-flash');
    expect(urls[1]).toContain('gemini-3.6-flash');
  });

  it('returns null when all models fail', async () => {
    const mockFetch = vi.fn(() => Promise.resolve(new Response('err', { status: 500 })));
    const result = await generateStructured(
      { fetch: mockFetch, now: Date.now, config: SAMPLE_CONFIG },
      { system: 'sys', contents: [], schema: {} },
      () => null,
    );
    expect(result).toBeNull();
  });

  it('skips when finishReason is MAX_TOKENS', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: 'partial' }] } }],
          }),
          { status: 200 },
        ),
      ),
    );
    const result = await generateStructured(
      { fetch: mockFetch, now: Date.now, config: { key: 'k', models: ['gemini-3.8-flash'] } },
      { system: 'sys', contents: [], schema: {} },
      (t) => t,
    );
    expect(result).toBeNull();
  });

  it('skips when blockReason is present', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            promptFeedback: { blockReason: 'SAFETY' },
            candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'x' }] } }],
          }),
          { status: 200 },
        ),
      ),
    );
    const result = await generateStructured(
      { fetch: mockFetch, now: Date.now, config: { key: 'k', models: ['gemini-3.8-flash'] } },
      { system: 'sys', contents: [], schema: {} },
      (t) => t,
    );
    expect(result).toBeNull();
  });

  it('skips when text is empty after joining non-thought parts', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '', thought: false }] } }],
          }),
          { status: 200 },
        ),
      ),
    );
    const result = await generateStructured(
      { fetch: mockFetch, now: Date.now, config: { key: 'k', models: ['gemini-3.8-flash'] } },
      { system: 'sys', contents: [], schema: {} },
      (t) => t || null,
    );
    expect(result).toBeNull();
  });

  it('filters out thought parts', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            candidates: [
              {
                finishReason: 'STOP',
                content: {
                  parts: [
                    { text: 'thought text', thought: true },
                    { text: '{"answer":"real"}', thought: false },
                  ],
                },
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );
    let captured = '';
    await generateStructured(
      { fetch: mockFetch, now: Date.now, config: { key: 'k', models: ['gemini-3.8-flash'] } },
      { system: 'sys', contents: [], schema: {} },
      (text) => { captured = text; return text; },
    );
    expect(captured).not.toContain('thought text');
    expect(captured).toContain('{"answer":"real"}');
  });

  it('skips when parse returns null', async () => {
    const mockFetch = vi.fn(() => Promise.resolve(makeGoodResponse('invalid')));
    const result = await generateStructured(
      { fetch: mockFetch, now: Date.now, config: { key: 'k', models: ['gemini-3.8-flash'] } },
      { system: 'sys', contents: [], schema: {} },
      () => null,
    );
    expect(result).toBeNull();
  });

  it('respects per-attempt timeout via abort signal', async () => {
    const mockFetch = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (signal) {
          signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }
      });
    });

    const result = await generateStructured(
      { fetch: mockFetch, now: Date.now, config: { key: 'k', models: ['gemini-3.8-flash'] } },
      { system: 'sys', contents: [], schema: {} },
      () => 'ok',
      { attemptMs: 10, totalMs: 100 },
    );
    expect(result).toBeNull();
  });

  it('skips models when total budget is exhausted', async () => {
    let call = 0;
    const times = [0, 0, 100000, 200000];
    const now = vi.fn(() => times[call++] ?? 200000);
    const mockFetch = vi.fn(() => Promise.resolve(new Response('err', { status: 500 })));

    const result = await generateStructured(
      { fetch: mockFetch, now, config: { key: 'k', models: ['gemini-3.8-flash', 'gemini-3.6-flash'] } },
      { system: 'sys', contents: [], schema: {} },
      () => 'ok',
      { totalMs: 50000 },
    );
    // second model is skipped because remaining < MIN_ATTEMPT_MS
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toBeNull();
  });

  it('never includes the API key in the return value', async () => {
    const SECRET_KEY = 'secret-api-key-12345';
    const mockFetch = vi.fn(() => Promise.resolve(makeGoodResponse('{"ok":true}')));
    const result = await generateStructured(
      { fetch: mockFetch, now: Date.now, config: { key: SECRET_KEY, models: ['gemini-3.8-flash'] } },
      { system: 'sys', contents: [], schema: {} },
      (text) => {
        try { return JSON.parse(text) as object; } catch { return null; }
      },
    );
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(SECRET_KEY);
  });
});

// Satisfy noUnusedLocals for MIN_ATTEMPT_MS import
void MIN_ATTEMPT_MS;
