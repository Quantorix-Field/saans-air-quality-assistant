import { guardRequest, parseBody, loadBundle, parseAiJson, tryGemini } from './pipeline.js';
import type { Deps, Handlers } from './pipeline.js';
import { jsonResponse, errorResponse } from './http.js';
import { fetchAir, searchPlaces } from './openmeteo.js';
import { AirQuerySchema, GeocodeQuerySchema, AdviceRequestSchema, AskRequestSchema, AiAdviceSchema, AiAskSchema } from '../shared/schemas.js';
import { rulesAnswer } from '../shared/domain/advice.js';
import { geminiConfig } from './gemini.js';
import { ADVICE_RESPONSE_SCHEMA, ASK_RESPONSE_SCHEMA, buildAdviceSystemPrompt, buildAskSystemPrompt, toContents, adviceUserText } from './prompts.js';

export type { Deps, Handlers };

export function createHandlers(deps: Deps): Handlers {
  const { fetch: fetcher, now, limiter, limits } = deps;
  // geminiConfig is read once here so env is not accessed per-request
  const cfg = geminiConfig(deps.env);

  async function air(request: Request): Promise<Response> {
    const guard = guardRequest(request, 'GET', limiter);
    if (guard) return guard;
    const params = Object.fromEntries(new URL(request.url).searchParams.entries());
    const parsed = AirQuerySchema.safeParse(params);
    if (!parsed.success) return errorResponse(400, 'invalid_request');
    try {
      const airData = await fetchAir(parsed.data.lat, parsed.data.lon, fetcher, now());
      return jsonResponse(airData, 200, { 'cache-control': 'public, s-maxage=600, stale-while-revalidate=1200' });
    } catch { return errorResponse(502, 'upstream_unavailable'); }
  }

  async function geocode(request: Request): Promise<Response> {
    const guard = guardRequest(request, 'GET', limiter);
    if (guard) return guard;
    const params = Object.fromEntries(new URL(request.url).searchParams.entries());
    const parsed = GeocodeQuerySchema.safeParse(params);
    if (!parsed.success) return errorResponse(400, 'invalid_request');
    try {
      const results = await searchPlaces(parsed.data.q, parsed.data.all === '1', fetcher);
      return jsonResponse({ results }, 200, { 'cache-control': 'public, s-maxage=3600, stale-while-revalidate=3600' });
    } catch { return errorResponse(502, 'upstream_unavailable'); }
  }

  async function advice(request: Request): Promise<Response> {
    const guard = guardRequest(request, 'POST', limiter);
    if (guard) return guard;
    const body = await parseBody(request, AdviceRequestSchema);
    if (!body.ok) return body.response;
    const { lat, lon, profile: profileInput, language } = body.value;
    const profile = { ...profileInput, language };
    const loaded = await loadBundle(lat, lon, profile, { fetch: fetcher, now });
    if (!loaded.ok) return loaded.response;
    const { bundle } = loaded;
    if (cfg) {
      const facts = bundle.facts;
      const parse = parseAiJson(AiAdviceSchema, (d) => [d.summary, ...d.tips].join('\n'), facts);
      const aiData = await tryGemini({ fetch: fetcher, now, config: cfg }, { system: buildAdviceSystemPrompt(facts), contents: toContents([], adviceUserText(facts.language)), schema: ADVICE_RESPONSE_SCHEMA }, parse, limits);
      if (aiData) return jsonResponse({ source: 'ai', language, summary: aiData.summary, tips: aiData.tips, actions: bundle.actions, aqi: bundle.aqi });
    }
    return jsonResponse({ source: 'rules', language, summary: bundle.summary, tips: [], actions: bundle.actions, aqi: bundle.aqi });
  }

  async function ask(request: Request): Promise<Response> {
    const guard = guardRequest(request, 'POST', limiter);
    if (guard) return guard;
    const body = await parseBody(request, AskRequestSchema);
    if (!body.ok) return body.response;
    const { lat, lon, profile: profileInput, language, question, history } = body.value;
    const profile = { ...profileInput, language };
    const loaded = await loadBundle(lat, lon, profile, { fetch: fetcher, now });
    if (!loaded.ok) return loaded.response;
    const { bundle } = loaded;
    if (cfg) {
      const facts = bundle.facts;
      const parse = parseAiJson(AiAskSchema, (d) => d.answer, facts);
      const aiData = await tryGemini({ fetch: fetcher, now, config: cfg }, { system: buildAskSystemPrompt(facts), contents: toContents(history, question), schema: ASK_RESPONSE_SCHEMA }, parse, limits);
      if (aiData) return jsonResponse({ source: 'ai', language, answer: aiData.answer });
    }
    return jsonResponse({ source: 'rules', language, answer: rulesAnswer(bundle) });
  }

  return { air, geocode, advice, ask };
}
