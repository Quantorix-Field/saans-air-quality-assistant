import type { FetchLike, UpstreamError } from './openmeteo.js';
import type { RateLimiter } from './rateLimit.js';
import { methodGuard, rateGuard, readJsonBody, jsonResponse, errorResponse } from './http.js';
import { fetchAir, searchPlaces } from './openmeteo.js';
import {
  AirQuerySchema,
  GeocodeQuerySchema,
  AdviceRequestSchema,
  AskRequestSchema,
  AiAdviceSchema,
  AiAskSchema,
} from '../shared/schemas.js';
import { buildAdvice, rulesAnswer } from '../shared/domain/advice.js';
import { passesNumberGuard } from '../shared/domain/numberGuard.js';
import { geminiConfig, generateStructured } from './gemini.js';
import {
  ADVICE_RESPONSE_SCHEMA,
  ASK_RESPONSE_SCHEMA,
  buildAdviceSystemPrompt,
  buildAskSystemPrompt,
  toContents,
  adviceUserText,
} from './prompts.js';

type Deps = {
  fetch: FetchLike;
  now: () => number;
  env: Readonly<Record<string, string | undefined>>;
  limiter: RateLimiter;
  limits?: { attemptMs?: number; totalMs?: number };
};

type Handlers = {
  air: (request: Request) => Promise<Response>;
  geocode: (request: Request) => Promise<Response>;
  advice: (request: Request) => Promise<Response>;
  ask: (request: Request) => Promise<Response>;
};

function isUpstreamError(err: unknown): err is UpstreamError {
  return err instanceof Error && err.name === 'UpstreamError';
}

function parseAiAdvice(text: string): { summary: string; tips: string[] } | null {
  try {
    const result = AiAdviceSchema.safeParse(JSON.parse(text) as unknown);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function parseAiAsk(text: string): { answer: string } | null {
  try {
    const result = AiAskSchema.safeParse(JSON.parse(text) as unknown);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function createHandlers(deps: Deps): Handlers {
  const { fetch: fetcher, now, env, limiter, limits } = deps;
  const cfg = geminiConfig(env);

  async function air(request: Request): Promise<Response> {
    const methodErr = methodGuard(request, 'GET');
    if (methodErr) return methodErr;
    const rateErr = rateGuard(request, limiter);
    if (rateErr) return rateErr;

    const params = Object.fromEntries(new URL(request.url).searchParams.entries());
    const parsed = AirQuerySchema.safeParse(params);
    if (!parsed.success) return errorResponse(400, 'invalid_request');

    try {
      const airData = await fetchAir(parsed.data.lat, parsed.data.lon, fetcher, now());
      return jsonResponse(airData, 200, { 'cache-control': 'public, s-maxage=600, stale-while-revalidate=1200' });
    } catch (err) {
      if (isUpstreamError(err)) return errorResponse(502, 'upstream_unavailable');
      return errorResponse(502, 'upstream_unavailable');
    }
  }

  async function geocode(request: Request): Promise<Response> {
    const methodErr = methodGuard(request, 'GET');
    if (methodErr) return methodErr;
    const rateErr = rateGuard(request, limiter);
    if (rateErr) return rateErr;

    const params = Object.fromEntries(new URL(request.url).searchParams.entries());
    const parsed = GeocodeQuerySchema.safeParse(params);
    if (!parsed.success) return errorResponse(400, 'invalid_request');

    try {
      const allCountries = parsed.data.all === '1';
      const results = await searchPlaces(parsed.data.q, allCountries, fetcher);
      return jsonResponse({ results }, 200, { 'cache-control': 'public, s-maxage=3600, stale-while-revalidate=3600' });
    } catch (err) {
      if (isUpstreamError(err)) return errorResponse(502, 'upstream_unavailable');
      return errorResponse(502, 'upstream_unavailable');
    }
  }

  async function advice(request: Request): Promise<Response> {
    const methodErr = methodGuard(request, 'POST');
    if (methodErr) return methodErr;
    const rateErr = rateGuard(request, limiter);
    if (rateErr) return rateErr;

    const bodyResult = await readJsonBody(request);
    if (!bodyResult.ok) return bodyResult.response;

    const parsed = AdviceRequestSchema.safeParse(bodyResult.value);
    if (!parsed.success) return errorResponse(400, 'invalid_request');

    const { lat, lon, profile: profileInput, language } = parsed.data;
    const profile = { ...profileInput, language };

    let airData;
    try {
      airData = await fetchAir(lat, lon, fetcher, now());
    } catch (err) {
      if (isUpstreamError(err)) return errorResponse(502, 'upstream_unavailable');
      return errorResponse(502, 'upstream_unavailable');
    }

    const bundle = buildAdvice(airData, profile, airData.dataAgeHours);
    if (!bundle) return errorResponse(502, 'upstream_unavailable');

    if (cfg) {
      const facts = bundle.facts;
      const system = buildAdviceSystemPrompt(facts);
      const contents = toContents([], adviceUserText(facts.language));
      const result = await generateStructured(
        { fetch: fetcher, now, config: cfg },
        { system, contents, schema: ADVICE_RESPONSE_SCHEMA },
        (text) => {
          const aiData = parseAiAdvice(text);
          if (!aiData) return null;
          const combined = [aiData.summary, ...aiData.tips].join('\n');
          return passesNumberGuard(combined, facts) ? aiData : null;
        },
        limits,
      );
      if (result) {
        const { summary, tips } = result.value;
        return jsonResponse({ source: 'ai', language, summary, tips, actions: bundle.actions, aqi: bundle.aqi });
      }
    }

    return jsonResponse({
      source: 'rules',
      language,
      summary: bundle.summary,
      tips: [],
      actions: bundle.actions,
      aqi: bundle.aqi,
    });
  }

  async function ask(request: Request): Promise<Response> {
    const methodErr = methodGuard(request, 'POST');
    if (methodErr) return methodErr;
    const rateErr = rateGuard(request, limiter);
    if (rateErr) return rateErr;

    const bodyResult = await readJsonBody(request);
    if (!bodyResult.ok) return bodyResult.response;

    const parsed = AskRequestSchema.safeParse(bodyResult.value);
    if (!parsed.success) return errorResponse(400, 'invalid_request');

    const { lat, lon, profile: profileInput, language, question, history } = parsed.data;
    const profile = { ...profileInput, language };

    let airData;
    try {
      airData = await fetchAir(lat, lon, fetcher, now());
    } catch (err) {
      if (isUpstreamError(err)) return errorResponse(502, 'upstream_unavailable');
      return errorResponse(502, 'upstream_unavailable');
    }

    const bundle = buildAdvice(airData, profile, airData.dataAgeHours);
    if (!bundle) return errorResponse(502, 'upstream_unavailable');

    if (cfg) {
      const facts = bundle.facts;
      const system = buildAskSystemPrompt(facts);
      const contents = toContents(history, question);
      const result = await generateStructured(
        { fetch: fetcher, now, config: cfg },
        { system, contents, schema: ASK_RESPONSE_SCHEMA },
        (text) => {
          const aiData = parseAiAsk(text);
          if (!aiData) return null;
          return passesNumberGuard(aiData.answer, facts) ? aiData : null;
        },
        limits,
      );
      if (result) {
        const { answer } = result.value;
        return jsonResponse({ source: 'ai', language, answer });
      }
    }

    return jsonResponse({ source: 'rules', language, answer: rulesAnswer(bundle) });
  }

  return { air, geocode, advice, ask };
}
