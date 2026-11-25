// @vitest-environment node
import type { AirResponse } from '../../shared/schemas.js';
import type { AdviceBundle } from '../../shared/domain/advice.js';

// 48 hours: Jan 14 00:00 to Jan 15 23:00; nowIndex=32 means Jan 15 08:00 (index 24+8=32)
// This gives 33 past hourly values (0-32), satisfying the 16-valid minimum for NAQI.
const HOURS_48 = 48;
const NOW_INDEX = 32; // 2026-01-15T08:00

function makeTime(i: number): string {
  const date = i < 24 ? '2026-01-14' : '2026-01-15';
  return `${date}T${String(i % 24).padStart(2, '0')}:00`;
}

/** Raw openmeteo API response body - this is what fetchAir sends to the upstream API and receives. */
export const RAW_AIR_UPSTREAM = {
  utc_offset_seconds: 19800,
  current: { time: '2026-01-15T08:00', us_aqi: 120 },
  hourly: {
    time: Array.from({ length: HOURS_48 }, (_, i) => makeTime(i)),
    pm2_5: Array.from({ length: HOURS_48 }, () => 60),
    pm10: Array.from({ length: HOURS_48 }, () => 100),
    nitrogen_dioxide: Array.from({ length: HOURS_48 }, () => 30),
    sulphur_dioxide: Array.from({ length: HOURS_48 }, () => 10),
    ozone: Array.from({ length: HOURS_48 }, () => 40),
    carbon_monoxide: Array.from({ length: HOURS_48 }, () => 500),
  },
};

/** A minimal valid parsed AirResponse for reference in tests. */
export const SAMPLE_AIR: AirResponse = {
  hours: Array.from({ length: HOURS_48 }, (_, i) => ({
    time: makeTime(i),
    pm25: 60,
    pm10: 100,
    no2: 30,
    so2: 10,
    o3: 40,
    co: 500,
  })),
  nowIndex: NOW_INDEX,
  usAqi: 120,
  observedAt: '2026-01-15T08:00',
  dataAgeHours: 0.5,
};

export const BASE_PROFILE = {
  ageGroup: 'adult' as const,
  conditions: [] as ('asthmaCopd' | 'heart' | 'pregnancy')[],
  commuteMode: 'walk' as const,
  hasPurifier: false,
  hasN95: false,
  outdoorHours: { start: 6, end: 20 },
};

export function makeAdviceBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    lat: 28.61,
    lon: 77.21,
    profile: BASE_PROFILE,
    language: 'en',
    ...overrides,
  };
}

export function makeAskBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    lat: 28.61,
    lon: 77.21,
    profile: BASE_PROFILE,
    language: 'en',
    question: 'Is it safe to run outside?',
    history: [],
    ...overrides,
  };
}

export function makeAirFetch(rawData: unknown = RAW_AIR_UPSTREAM): (url: string) => Promise<Response> {
  return (_url: string) =>
    Promise.resolve(new Response(JSON.stringify(rawData), { status: 200, headers: { 'content-type': 'application/json' } }));
}

export const SAMPLE_BUNDLE: Pick<AdviceBundle, 'summary' | 'aqi' | 'actions'> = {
  summary: 'Air quality is Moderate (index 110). Your caution level is 2 out of 5.',
  aqi: {
    index: 110,
    band: 'moderate',
    label: 'Moderate',
    dominant: 'pm25',
    partial: false,
  },
  actions: [],
};
