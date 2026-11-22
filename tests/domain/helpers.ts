import type { AirSeries, HourlyPoint } from '../../shared/domain/types.js';

const pad = (value: number): string => String(value).padStart(2, '0');

/** `count` consecutive hours starting at 2026-11-20T00:00, with the given values on every hour. */
export function makeHours(count: number, values: Partial<Omit<HourlyPoint, 'time'>> = {}): HourlyPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    time: `2026-11-${pad(20 + Math.floor(i / 24))}T${pad(i % 24)}:00`,
    pm25: 20,
    pm10: 40,
    no2: 20,
    so2: 5,
    o3: 30,
    co: 300,
    ...values,
  }));
}

export function makeSeries(
  count = 72,
  nowIndex = 30,
  values: Partial<Omit<HourlyPoint, 'time'>> = {},
): AirSeries {
  return { hours: makeHours(count, values), nowIndex, usAqi: null };
}
