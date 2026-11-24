// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { fetchAir, type FetchLike, round2, searchPlaces, UpstreamError } from '../../server/openmeteo.js';

const times = Array.from({ length: 72 }, (_, i) => `2026-11-${String(21 + Math.floor(i / 24))}T${String(i % 24).padStart(2, '0')}:00`);
const column = (value: number | null): (number | null)[] => times.map(() => value);

function airBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    utc_offset_seconds: 19_800,
    current: { time: '2026-11-22T13:15', us_aqi: 160 },
    hourly: {
      time: times,
      pm2_5: column(80),
      pm10: column(120),
      nitrogen_dioxide: column(30),
      sulphur_dioxide: column(null),
      ozone: column(-5),
      carbon_monoxide: column(400),
    },
    ...overrides,
  };
}

const respond = (body: unknown, status = 200): FetchLike => async () =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

// 2026-11-22T13:15 local at +05:30 is 07:45 UTC; 30 minutes later is 08:15 UTC.
const NOW = Date.parse('2026-11-22T08:15:00Z');

describe('fetchAir', () => {
  it('maps the response, picks the current hour and treats bad values as missing', async () => {
    const result = await fetchAir(28.6139, 77.209, respond(airBody()), NOW);
    expect(result.hours).toHaveLength(72);
    expect(result.nowIndex).toBe(37);
    expect(result.usAqi).toBe(160);
    expect(result.observedAt).toBe('2026-11-22T13:15');
    expect(result.dataAgeHours).toBe(0.5);
    const hour = result.hours[37];
    expect(hour?.pm25).toBe(80);
    expect(hour?.so2).toBeNull();
    expect(hour?.o3).toBeNull();
    expect(hour?.co).toBe(400);
  });

  it('sends rounded coordinates and the planned query', async () => {
    let seen = '';
    const fetcher: FetchLike = async (url) => {
      seen = url;
      return new Response(JSON.stringify(airBody()), { status: 200 });
    };
    await fetchAir(28.61389, 77.20901, fetcher, NOW);
    expect(seen).toContain('latitude=28.61');
    expect(seen).toContain('longitude=77.21');
    expect(seen).toContain('past_days=1');
    expect(seen).toContain('forecast_days=2');
    expect(seen).toContain('timezone=auto');
    expect(seen).not.toContain('28.61389');
  });

  it('never reports a negative age and handles a missing US AQI', async () => {
    const body = airBody({ current: { time: '2026-11-22T13:15' } });
    const result = await fetchAir(1, 1, respond(body), 0);
    expect(result.dataAgeHours).toBe(0);
    expect(result.usAqi).toBeNull();
    const negative = await fetchAir(1, 1, respond(airBody({ current: { time: '2026-11-22T13:15', us_aqi: -1 } })), NOW);
    expect(negative.usAqi).toBeNull();
  });

  it('fails with a fixed error when upstream is down, malformed or has no current hour', async () => {
    const bodies: FetchLike[] = [
      respond({}, 503),
      respond({ nonsense: true }),
      respond(airBody({ current: { time: '2020-01-01T00:00' } })),
      async () => {
        throw new TypeError('network down 28.61,77.20');
      },
      async () => new Response('not json', { status: 200 }),
    ];
    for (const fetcher of bodies) {
      let caught: unknown = null;
      try {
        await fetchAir(28, 77, fetcher, NOW);
      } catch (error) {
        caught = error;
      }
      expect(caught instanceof UpstreamError).toBe(true);
      expect((caught as Error).message).toBe('upstream unavailable');
    }
  });
});

describe('searchPlaces', () => {
  const body = {
    results: [
      { name: 'Delhi', latitude: 28.65195, longitude: 77.23149, country: 'India', admin1: 'Delhi' },
      { name: 'Nowhere', latitude: 1, longitude: 2 },
    ],
  };

  it('returns rounded places and limits the search to India by default', async () => {
    let seen = '';
    const fetcher: FetchLike = async (url) => {
      seen = url;
      return new Response(JSON.stringify(body), { status: 200 });
    };
    const places = await searchPlaces('Delhi', false, fetcher);
    expect(seen).toContain('countryCode=IN');
    expect(places[0]).toEqual({ name: 'Delhi', region: 'Delhi', country: 'India', lat: 28.65, lon: 77.23 });
    expect(places[1]).toEqual({ name: 'Nowhere', region: '', country: '', lat: 1, lon: 2 });
  });

  it('drops the country filter for other countries and handles no results', async () => {
    let seen = '';
    const fetcher: FetchLike = async (url) => {
      seen = url;
      return new Response('{}', { status: 200 });
    };
    expect(await searchPlaces('Paris', true, fetcher)).toEqual([]);
    expect(seen).not.toContain('countryCode');
  });

  it('fails with a fixed error on bad upstream data', async () => {
    let caught: unknown = null;
    try {
      await searchPlaces('x', false, respond({ results: [{ name: 'A', latitude: 999, longitude: 0 }] }));
    } catch (error) {
      caught = error;
    }
    expect(caught instanceof UpstreamError).toBe(true);
  });
});

describe('round2', () => {
  it('rounds to two decimals', () => {
    expect(round2(28.61389)).toBe(28.61);
    expect(round2(-77.206)).toBe(-77.21);
  });
});
