import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { clearApiCache, setNowFn } from '../src/data/apiClient.js';
import { getAir, searchPlaces, getAdvice, roundCoord } from '../src/data/api.js';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

const fakeAir = {
  hours: [{ time: '2026-01-01T12:00', pm25: 50, pm10: 60, no2: 20, so2: 10, o3: 30, co: 500 }],
  nowIndex: 0,
  usAqi: 80,
  observedAt: '2026-01-01T12:00',
  dataAgeHours: 0.5,
};

const fakeGeocode = {
  results: [
    { name: 'Delhi', region: 'Delhi', country: 'India', lat: 28.6139, lon: 77.2090 },
  ],
};

describe('roundCoord', () => {
  it('rounds to 2 decimal places', () => {
    expect(roundCoord(28.61399)).toBe(28.61);
    expect(roundCoord(77.20901)).toBe(77.21);
    expect(roundCoord(0.005)).toBe(0.01);
    expect(roundCoord(-1.559)).toBe(-1.56);
    expect(roundCoord(0)).toBe(0);
  });
});

describe('api functions', () => {
  beforeEach(() => {
    setNowFn(() => Date.now());
    clearApiCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearApiCache();
  });

  it('getAir rounds coordinates in the URL', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => Promise.resolve(jsonResponse(fakeAir)),
    );
    const place = { name: 'Delhi', region: '', country: 'India', lat: 28.61399, lon: 77.20901 };
    await getAir(place);
    const calledUrl = spy.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('lat=28.61');
    expect(calledUrl).toContain('lon=77.21');
  });

  it('searchPlaces includes query and all param', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => Promise.resolve(jsonResponse(fakeGeocode)),
    );
    await searchPlaces('Delhi', false);
    const calledUrl = spy.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('q=Delhi');
    expect(calledUrl).toContain('all=0');
  });

  it('searchPlaces with allCountries=true passes all=1', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => Promise.resolve(jsonResponse(fakeGeocode)),
    );
    await searchPlaces('London', true);
    const calledUrl = spy.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('all=1');
  });

  it('getAdvice sends POST with rounded coords and profile', async () => {
    const fakeAdvice = {
      source: 'rules',
      language: 'en',
      summary: 'Test',
      tips: [],
      actions: [],
      aqi: { index: 50, band: 'good', label: 'Good', dominant: 'pm25', partial: false },
    };
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => Promise.resolve(jsonResponse(fakeAdvice)),
    );

    const place = { name: 'Delhi', region: '', country: 'India', lat: 28.61399, lon: 77.20901 };
    const profile = {
      ageGroup: 'adult' as const,
      conditions: [],
      commuteMode: 'metro' as const,
      hasPurifier: false,
      hasN95: false,
      outdoorHours: { start: 6, end: 20 },
    };
    await getAdvice({ place, profile, language: 'en' });

    expect(spy).toHaveBeenCalledTimes(1);
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/advice');
    expect(init.method).toBe('POST');

    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body['lat']).toBe(28.61);
    expect(body['lon']).toBe(77.21);
    expect(body['language']).toBe('en');
    expect(body['profile']).toBeDefined();
  });
});
