import { z } from 'zod';
import type { FetchLike, UpstreamError } from './openmeteo.js';
import type { RateLimiter } from './rateLimit.js';
import type { AirResponse } from '../shared/schemas.js';
import { methodGuard, rateGuard, readJsonBody, errorResponse } from './http.js';
import { fetchAir } from './openmeteo.js';
import { buildAdvice } from '../shared/domain/advice.js';
import type { AdviceBundle } from '../shared/domain/advice.js';
import { passesNumberGuard } from '../shared/domain/numberGuard.js';
import { generateStructured, type GeminiConfig } from './gemini.js';

export type Deps = {
  fetch: FetchLike;
  now: () => number;
  env: Readonly<Record<string, string | undefined>>;
  limiter: RateLimiter;
  limits?: { attemptMs?: number; totalMs?: number };
};

export type Handlers = {
  air: (request: Request) => Promise<Response>;
  geocode: (request: Request) => Promise<Response>;
  advice: (request: Request) => Promise<Response>;
  ask: (request: Request) => Promise<Response>;
};

/** Method guard then rate guard. Returns a Response on failure, null on pass. */
export function guardRequest(request: Request, method: 'GET' | 'POST', limiter: RateLimiter): Response | null {
  return methodGuard(request, method) ?? rateGuard(request, limiter);
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; response: Response };

/** readJsonBody + zod safeParse in one step. Returns 400 invalid_request on failure. */
export async function parseBody<T>(request: Request, schema: z.ZodType<T>): Promise<ParseResult<T>> {
  const bodyResult = await readJsonBody(request);
  if (!bodyResult.ok) return bodyResult;
  const parsed = schema.safeParse(bodyResult.value);
  if (!parsed.success) return { ok: false, response: errorResponse(400, 'invalid_request') };
  return { ok: true, value: parsed.data };
}

function isUpstreamError(err: unknown): err is UpstreamError {
  return err instanceof Error && err.name === 'UpstreamError';
}

/** fetchAir + buildAdvice. Maps UpstreamError, any other error and a null bundle to 502 upstream_unavailable. */
export async function loadBundle(
  lat: number,
  lon: number,
  profile: Parameters<typeof buildAdvice>[1],
  deps: { fetch: FetchLike; now: () => number },
): Promise<{ ok: true; bundle: AdviceBundle; air: AirResponse } | { ok: false; response: Response }> {
  let air: AirResponse;
  try {
    air = await fetchAir(lat, lon, deps.fetch, deps.now());
  } catch (err) {
    void isUpstreamError(err); // narrowing is irrelevant: always 502
    return { ok: false, response: errorResponse(502, 'upstream_unavailable') };
  }
  const bundle = buildAdvice(air, profile, air.dataAgeHours);
  if (!bundle) return { ok: false, response: errorResponse(502, 'upstream_unavailable') };
  return { ok: true, bundle, air };
}

/** Returns a parser function: (text) => T | null, validating with schema then numberGuard. */
export function parseAiJson<T extends Record<string, unknown>>(
  schema: z.ZodType<T>,
  getText: (data: T) => string,
  facts: Parameters<typeof passesNumberGuard>[1],
): (text: string) => T | null {
  return (text: string): T | null => {
    try {
      const result = schema.safeParse(JSON.parse(text) as unknown);
      if (!result.success) return null;
      return passesNumberGuard(getText(result.data), facts) ? result.data : null;
    } catch {
      return null;
    }
  };
}

type GeminiDeps = { fetch: FetchLike; now: () => number; config: GeminiConfig };
type GeminiRequest = { system: string; contents: Array<{ role: string; parts: Array<{ text: string }> }>; schema: unknown };

/** generateStructured wrapped: returns T | null, never throws. */
export async function tryGemini<T>(
  deps: GeminiDeps,
  request: GeminiRequest,
  parse: (text: string) => T | null,
  limits?: { attemptMs?: number; totalMs?: number },
): Promise<T | null> {
  const result = await generateStructured(deps, request, parse, limits);
  return result ? result.value : null;
}
