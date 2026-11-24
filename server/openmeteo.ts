import { z } from 'zod';
import type { AirResponse, Place } from '../shared/schemas.js';

export const UPSTREAM_TIMEOUT_MS = 8000;
const AIR_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const HOURLY = 'pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Any failure talking to Open-Meteo. The message is fixed so nothing sensitive can leak. */
export class UpstreamError extends Error {
  constructor() {
    super('upstream unavailable');
    this.name = 'UpstreamError';
  }
}

export const round2 = (value: number): number => Math.round(value * 100) / 100;

const localTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
const column = z.array(z.number().nullable());

const AirUpstreamSchema = z.object({
  utc_offset_seconds: z.number().int().default(0),
  current: z.object({ time: localTime, us_aqi: z.number().nullable().optional() }),
  hourly: z.object({
    time: z.array(localTime).min(1).max(96),
    pm2_5: column,
    pm10: column,
    nitrogen_dioxide: column,
    sulphur_dioxide: column,
    ozone: column,
    carbon_monoxide: column,
  }),
});

const GeocodeUpstreamSchema = z.object({
  results: z
    .array(
      z.object({
        name: z.string().min(1),
        latitude: z.number().finite().min(-90).max(90),
        longitude: z.number().finite().min(-180).max(180),
        country: z.string().optional(),
        admin1: z.string().optional(),
      }),
    )
    .optional(),
});

async function getJson(fetcher: FetchLike, url: string): Promise<unknown> {
  try {
    const response = await fetcher(url, {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      headers: { accept: 'application/json' },
    });
    if (!response.ok) throw new UpstreamError();
    return (await response.json()) as unknown;
  } catch {
    throw new UpstreamError();
  }
}

/** Concentrations must be zero or more; anything else counts as missing. */
function clean(values: readonly (number | null)[], index: number): number | null {
  const value = values[index];
  return typeof value === 'number' && value >= 0 ? value : null;
}

/** Last hourly slot that is not after the current reading, comparing "YYYY-MM-DDTHH". */
function currentSlot(times: readonly string[], currentTime: string): number {
  const hour = currentTime.slice(0, 13);
  let found = -1;
  times.forEach((time, index) => {
    if (time.slice(0, 13) <= hour) found = index;
  });
  return found;
}

/** Hours since the latest reading. The reading time is local, so the UTC offset is removed first. */
function ageInHours(currentTime: string, offsetSeconds: number, nowMs: number): number {
  const readingMs = Date.parse(`${currentTime}:00Z`) - offsetSeconds * 1000;
  return Math.round((Math.max(0, nowMs - readingMs) / 3_600_000) * 10) / 10;
}

export async function fetchAir(lat: number, lon: number, fetcher: FetchLike, nowMs: number): Promise<AirResponse> {
  const query = new URLSearchParams({
    latitude: String(round2(lat)),
    longitude: String(round2(lon)),
    current: 'us_aqi',
    hourly: HOURLY,
    past_days: '1',
    forecast_days: '2',
    timezone: 'auto',
  });
  const parsed = AirUpstreamSchema.safeParse(await getJson(fetcher, `${AIR_URL}?${query.toString()}`));
  if (!parsed.success) throw new UpstreamError();
  const { current, hourly, utc_offset_seconds: offset } = parsed.data;
  const nowIndex = currentSlot(hourly.time, current.time);
  if (nowIndex < 0) throw new UpstreamError();
  return {
    hours: hourly.time.map((time, i) => ({
      time,
      pm25: clean(hourly.pm2_5, i),
      pm10: clean(hourly.pm10, i),
      no2: clean(hourly.nitrogen_dioxide, i),
      so2: clean(hourly.sulphur_dioxide, i),
      o3: clean(hourly.ozone, i),
      co: clean(hourly.carbon_monoxide, i),
    })),
    nowIndex,
    usAqi: current.us_aqi !== undefined && current.us_aqi !== null && current.us_aqi >= 0 ? current.us_aqi : null,
    observedAt: current.time,
    dataAgeHours: ageInHours(current.time, offset, nowMs),
  };
}

export async function searchPlaces(name: string, allCountries: boolean, fetcher: FetchLike): Promise<Place[]> {
  const query = new URLSearchParams({ name, count: '5', language: 'en', format: 'json' });
  if (!allCountries) query.set('countryCode', 'IN');
  const parsed = GeocodeUpstreamSchema.safeParse(await getJson(fetcher, `${GEOCODE_URL}?${query.toString()}`));
  if (!parsed.success) throw new UpstreamError();
  return (parsed.data.results ?? []).slice(0, 5).map((item) => ({
    name: item.name,
    region: item.admin1 ?? '',
    country: item.country ?? '',
    lat: round2(item.latitude),
    lon: round2(item.longitude),
  }));
}
