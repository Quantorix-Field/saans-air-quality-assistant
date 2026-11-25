import { z } from 'zod';
import type { FetchLike } from './openmeteo.js';

export const DEFAULT_MODEL = 'gemini-3.8-flash';
export const DEFAULT_FALLBACKS = ['gemini-3.6-flash'];
export const ATTEMPT_TIMEOUT_MS = 22000;
export const TOTAL_BUDGET_MS = 50000;
export const MIN_ATTEMPT_MS = 2000;
export const MODEL_ID_PATTERN = /^[a-z][a-z0-9.-]{2,59}$/;

export type GeminiConfig = { key: string; models: string[] };

export function geminiConfig(env: Readonly<Record<string, string | undefined>>): GeminiConfig | null {
  const key = (env['GEMINI_API_KEY'] ?? '').trim();
  if (!key) return null;

  const rawPrimary = (env['GEMINI_MODEL'] ?? '').trim();
  const primary = MODEL_ID_PATTERN.test(rawPrimary) ? rawPrimary : DEFAULT_MODEL;

  const rawFallbacks = (env['GEMINI_FALLBACK_MODELS'] ?? '').trim();
  let fallbackCandidates: string[];
  if (rawFallbacks) {
    fallbackCandidates = rawFallbacks
      .split(',')
      .map((s) => s.trim())
      .filter((s) => MODEL_ID_PATTERN.test(s));
  } else {
    fallbackCandidates = [...DEFAULT_FALLBACKS];
  }

  const seen = new Set<string>([primary]);
  const fallbacks: string[] = [];
  for (const candidate of fallbackCandidates) {
    if (!seen.has(candidate) && fallbacks.length < 3) {
      seen.add(candidate);
      fallbacks.push(candidate);
    }
  }

  return { key, models: [primary, ...fallbacks] };
}

const GeminiResponseSchema = z.object({
  promptFeedback: z.object({ blockReason: z.string() }).optional(),
  candidates: z
    .array(
      z.object({
        finishReason: z.string(),
        content: z.object({
          parts: z.array(z.object({ text: z.string().optional(), thought: z.boolean().optional() })),
        }),
      }),
    )
    .min(1),
});

type Deps = { fetch: FetchLike; now: () => number; config: GeminiConfig };
type RequestPayload = {
  system: string;
  contents: Array<{ role: string; parts: Array<{ text: string }> }>;
  schema: unknown;
};
type Limits = { attemptMs?: number; totalMs?: number };

export async function generateStructured<T>(
  deps: Deps,
  request: RequestPayload,
  parse: (text: string) => T | null,
  limits?: Limits,
): Promise<{ value: T; model: string } | null> {
  const deadline = deps.now() + (limits?.totalMs ?? TOTAL_BUDGET_MS);
  const attemptMs = limits?.attemptMs ?? ATTEMPT_TIMEOUT_MS;

  for (const model of deps.config.models) {
    const remaining = deadline - deps.now();
    if (remaining < MIN_ATTEMPT_MS) break;

    const timeout = Math.min(attemptMs, remaining);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

    try {
      const response = await deps.fetch(url, {
        method: 'POST',
        signal: AbortSignal.timeout(timeout),
        headers: { 'content-type': 'application/json', 'x-goog-api-key': deps.config.key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: request.system }] },
          contents: request.contents,
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: request.schema,
            maxOutputTokens: 4096,
          },
        }),
      });

      if (!response.ok) continue;

      const parsed = GeminiResponseSchema.safeParse((await response.json()) as unknown);
      if (!parsed.success) continue;

      const data = parsed.data;
      if (data.promptFeedback?.blockReason) continue;

      const candidate = data.candidates[0];
      if (!candidate || candidate.finishReason !== 'STOP') continue;

      const text = candidate.content.parts
        .filter((p) => p.thought !== true)
        .map((p) => p.text ?? '')
        .join('');

      if (!text) continue;

      const value = parse(text);
      if (value === null) continue;

      return { value, model };
    } catch {
      // network error, timeout, etc. - try next model
    }
  }

  return null;
}
