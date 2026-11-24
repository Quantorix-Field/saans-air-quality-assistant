import { describe, expect, it } from 'vitest';
import {
  AdviceRequestSchema,
  AdviceResponseSchema,
  AiAdviceSchema,
  AiAskSchema,
  AirQuerySchema,
  AirResponseSchema,
  AskRequestSchema,
  GeocodeQuerySchema,
  GeocodeResponseSchema,
  ProfileSchema,
} from '../shared/schemas.js';

const profile = {
  ageGroup: 'adult',
  conditions: ['asthmaCopd'],
  commuteMode: 'metro',
  hasPurifier: false,
  hasN95: true,
  outdoorHours: { start: 5, end: 21 },
};
const advice = { lat: 28.61, lon: 77.2, profile, language: 'en' };

describe('request schemas', () => {
  it('accepts a valid advice request', () => {
    expect(AdviceRequestSchema.safeParse(advice).success).toBe(true);
    expect(ProfileSchema.safeParse({ ...profile, language: 'hi' }).success).toBe(true);
  });

  it('rejects out of range coordinates, unknown keys and bad profiles', () => {
    expect(AdviceRequestSchema.safeParse({ ...advice, lat: 91 }).success).toBe(false);
    expect(AdviceRequestSchema.safeParse({ ...advice, lon: -181 }).success).toBe(false);
    expect(AdviceRequestSchema.safeParse({ ...advice, lat: Number.NaN }).success).toBe(false);
    expect(AdviceRequestSchema.safeParse({ ...advice, extra: 1 }).success).toBe(false);
    expect(AdviceRequestSchema.safeParse({ ...advice, language: 'fr' }).success).toBe(false);
    expect(AdviceRequestSchema.safeParse({ ...advice, profile: { ...profile, ageGroup: 'teen' } }).success).toBe(false);
    expect(AdviceRequestSchema.safeParse({ ...advice, profile: { ...profile, outdoorHours: { start: 9, end: 9 } } }).success).toBe(false);
    expect(AdviceRequestSchema.safeParse({ ...advice, profile: { ...profile, outdoorHours: { start: -1, end: 9 } } }).success).toBe(false);
    expect(AdviceRequestSchema.safeParse({ ...advice, profile: { ...profile, admin: true } }).success).toBe(false);
  });

  it('checks the question and the history of an ask request', () => {
    const ask = { ...advice, question: '  Can I run today?  ' };
    const parsed = AskRequestSchema.safeParse(ask);
    expect(parsed.success && parsed.data.question).toBe('Can I run today?');
    expect(parsed.success && parsed.data.history).toEqual([]);
    expect(AskRequestSchema.safeParse({ ...ask, question: '   ' }).success).toBe(false);
    expect(AskRequestSchema.safeParse({ ...ask, question: 'x'.repeat(401) }).success).toBe(false);
    expect(AskRequestSchema.safeParse({ ...ask, question: 'x'.repeat(400) }).success).toBe(true);
    const turn = { role: 'user', text: 'hi' };
    expect(AskRequestSchema.safeParse({ ...ask, history: Array(6).fill(turn) }).success).toBe(true);
    expect(AskRequestSchema.safeParse({ ...ask, history: Array(7).fill(turn) }).success).toBe(false);
    expect(AskRequestSchema.safeParse({ ...ask, history: [{ role: 'system', text: 'x' }] }).success).toBe(false);
    expect(AskRequestSchema.safeParse({ ...ask, history: [{ role: 'user', text: 'x'.repeat(801) }] }).success).toBe(false);
  });
});

describe('query schemas', () => {
  it('turns coordinate text into numbers and rejects anything else', () => {
    const ok = AirQuerySchema.safeParse({ lat: '28.61', lon: '-77.2' });
    expect(ok.success && ok.data).toEqual({ lat: 28.61, lon: -77.2 });
    for (const lat of ['', '1e5', '28.', 'abc', '91', '28.1234567']) {
      expect(AirQuerySchema.safeParse({ lat, lon: '77' }).success).toBe(false);
    }
    expect(AirQuerySchema.safeParse({ lon: '77' }).success).toBe(false);
  });

  it('trims and bounds a place search', () => {
    const ok = GeocodeQuerySchema.safeParse({ q: '  Pune ', all: '1' });
    expect(ok.success && ok.data.q).toBe('Pune');
    expect(GeocodeQuerySchema.safeParse({ q: 'a' }).success).toBe(false);
    expect(GeocodeQuerySchema.safeParse({ q: 'x'.repeat(81) }).success).toBe(false);
    expect(GeocodeQuerySchema.safeParse({ q: 'Pune', all: 'yes' }).success).toBe(false);
  });
});

describe('response schemas', () => {
  const hour = { time: '2026-11-22T13:00', pm25: 10, pm10: null, no2: 1, so2: 1, o3: 1, co: 1 };

  it('accepts a good air response and rejects bad ones', () => {
    const air = { hours: [hour], nowIndex: 0, usAqi: null, observedAt: '2026-11-22T13:15', dataAgeHours: 0.2 };
    expect(AirResponseSchema.safeParse(air).success).toBe(true);
    expect(AirResponseSchema.safeParse({ ...air, hours: [] }).success).toBe(false);
    expect(AirResponseSchema.safeParse({ ...air, hours: [{ ...hour, pm25: -1 }] }).success).toBe(false);
    expect(AirResponseSchema.safeParse({ ...air, hours: [{ ...hour, time: 'yesterday' }] }).success).toBe(false);
  });

  it('accepts places and advice responses', () => {
    expect(GeocodeResponseSchema.safeParse({ results: [{ name: 'Pune', region: 'MH', country: 'India', lat: 18.5, lon: 73.8 }] }).success).toBe(true);
    const body = {
      source: 'rules',
      language: 'en',
      summary: 's',
      tips: [],
      actions: [{ id: 'red-flags', category: 'health', title: 't', why: 'w' }],
      aqi: { index: 120, band: 'moderate', label: 'Moderate', dominant: 'pm25', partial: false },
    };
    expect(AdviceResponseSchema.safeParse(body).success).toBe(true);
    expect(AdviceResponseSchema.safeParse({ ...body, source: 'magic' }).success).toBe(false);
  });
});

describe('AI output schemas', () => {
  it('accepts short structured text only', () => {
    expect(AiAdviceSchema.safeParse({ summary: ' ok ', tips: ['a'] }).success).toBe(true);
    expect(AiAdviceSchema.safeParse({ summary: '', tips: [] }).success).toBe(false);
    expect(AiAdviceSchema.safeParse({ summary: 'x', tips: Array(6).fill('a') }).success).toBe(false);
    expect(AiAdviceSchema.safeParse({ summary: 'x'.repeat(701), tips: [] }).success).toBe(false);
    expect(AiAskSchema.safeParse({ answer: 'ok' }).success).toBe(true);
    expect(AiAskSchema.safeParse({ answer: 'x'.repeat(1201) }).success).toBe(false);
    expect(AiAskSchema.safeParse({}).success).toBe(false);
  });
});
