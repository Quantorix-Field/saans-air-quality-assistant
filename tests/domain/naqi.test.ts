import { describe, expect, it } from 'vitest';
import { computeNaqi, hourlyIndex, subIndex, trailingMean } from '../../shared/domain/naqi.js';
import { POLLUTANTS, type Pollutant } from '../../shared/domain/types.js';
import { makeHours, makeSeries } from './helpers.js';

describe('subIndex (hand-computed CPCB values)', () => {
  const cases: [Pollutant, number, number][] = [
    ['pm25', 0, 0],
    ['pm25', 30, 50],
    ['pm25', 31, 51],
    ['pm25', 45, 75],
    ['pm25', 60, 100],
    ['pm25', 90, 200],
    ['pm25', 100, 232],
    ['pm25', 380, 500],
    ['pm25', 400, 500],
    ['pm10', 200, 167],
    ['no2', 60, 75],
    ['o3', 120, 129],
    ['co', 1.5, 73],
    ['so2', 100, 107],
  ];
  for (const [pollutant, concentration, expected] of cases) {
    it(`${pollutant} at ${concentration} gives ${expected}`, () => {
      expect(Math.round(subIndex(pollutant, concentration))).toBe(expected);
    });
  }

  it('treats the gap between two bands as the start of the higher band', () => {
    expect(Math.round(subIndex('pm25', 30.5))).toBe(51);
  });

  for (const pollutant of POLLUTANTS) {
    it(`never decreases and stays within 0-500 for ${pollutant}`, () => {
      let previous = -1;
      for (let concentration = 0; concentration <= 3000; concentration += 0.5) {
        const value = subIndex(pollutant, concentration);
        expect(value).toBeGreaterThanOrEqual(previous);
        expect(value).toBeLessThanOrEqual(500);
        previous = value;
      }
    });
  }
});

describe('trailingMean', () => {
  it('averages the last N values including the end index', () => {
    expect(trailingMean([1, 2, 3, 4, 5], 4, 3, 1)).toBe(4);
  });
  it('ignores missing values but needs enough of them', () => {
    expect(trailingMean([1, null, 3], 2, 3, 2)).toBe(2);
    expect(trailingMean([1, null, null], 2, 3, 2)).toBeNull();
  });
  it('uses what exists when the window starts before the data', () => {
    expect(trailingMean([10, 20], 1, 24, 2)).toBe(15);
  });
});

describe('computeNaqi', () => {
  it('uses the highest sub-index and names the dominant pollutant', () => {
    const result = computeNaqi(
      makeSeries(72, 30, { pm25: 45, pm10: 80, no2: 30, so2: 10, o3: 40, co: 500 }),
    );
    expect(result?.subIndices.pm25).toBe(75);
    expect(result?.subIndices.pm10).toBe(80);
    expect(result?.subIndices.no2).toBe(38);
    expect(result?.subIndices.so2).toBe(13);
    expect(result?.subIndices.o3).toBe(40);
    expect(result?.subIndices.co).toBe(25);
    expect(result?.index).toBe(80);
    expect(result?.dominant).toBe('pm10');
    expect(result?.band.key).toBe('satisfactory');
    expect(result?.partial).toBe(false);
  });

  it('smooths a short spike with the 24-hour average', () => {
    const hours = makeHours(72, { pm25: 20 });
    hours[30] = { ...(hours[30] as (typeof hours)[number]), pm25: 140 };
    const result = computeNaqi({ hours, nowIndex: 30, usAqi: null });
    expect(result?.averages.pm25).toBeCloseTo((23 * 20 + 140) / 24, 5);
  });

  it('uses only the last 8 hours for ozone and CO', () => {
    const hours = makeHours(72, { o3: 10 });
    hours[19] = { ...(hours[19] as (typeof hours)[number]), o3: 900 };
    const result = computeNaqi({ hours, nowIndex: 30, usAqi: null });
    expect(result?.averages.o3).toBe(10);
  });

  it('converts CO from ug/m3 to mg/m3', () => {
    const result = computeNaqi(makeSeries(72, 30, { co: 1500 }));
    expect(result?.subIndices.co).toBe(73);
  });

  it('tolerates some missing hours but drops a pollutant with too few', () => {
    const hours = makeHours(72, { pm25: 45 });
    for (let i = 7; i <= 14; i += 1) hours[i] = { ...(hours[i] as (typeof hours)[number]), pm25: null };
    expect(computeNaqi({ hours, nowIndex: 30, usAqi: null })?.subIndices.pm25).toBe(75);
    for (let i = 15; i <= 16; i += 1) hours[i] = { ...(hours[i] as (typeof hours)[number]), pm25: null };
    expect(computeNaqi({ hours, nowIndex: 30, usAqi: null })?.subIndices.pm25).toBeUndefined();
  });

  it('is partial with fewer than three pollutants', () => {
    const result = computeNaqi(
      makeSeries(72, 30, { pm10: null, no2: null, so2: null, o3: null, co: null }),
    );
    expect(result?.partial).toBe(true);
    expect(result?.dominant).toBe('pm25');
  });

  it('returns null without any particulate data', () => {
    expect(computeNaqi(makeSeries(72, 30, { pm25: null, pm10: null }))).toBeNull();
  });

  it('returns null when the current hour is outside the data', () => {
    expect(computeNaqi(makeSeries(10, 10))).toBeNull();
    expect(computeNaqi(makeSeries(10, -1))).toBeNull();
  });

  it('needs enough history to average', () => {
    expect(computeNaqi(makeSeries(72, 5, { pm10: null }))).toBeNull();
  });

  it('caps severe air at 500', () => {
    const result = computeNaqi(makeSeries(72, 30, { pm25: 900, pm10: 1200 }));
    expect(result?.index).toBe(500);
    expect(result?.band.key).toBe('severe');
  });
});

describe('hourlyIndex', () => {
  const base = { time: '2026-11-20T10:00', no2: null, so2: null, o3: null, co: null };
  it('takes the higher of PM2.5 and PM10', () => {
    expect(hourlyIndex({ ...base, pm25: 45, pm10: 200 })).toBe(167);
  });
  it('works with one of them missing and returns null with neither', () => {
    expect(hourlyIndex({ ...base, pm25: 45, pm10: null })).toBe(75);
    expect(hourlyIndex({ ...base, pm25: null, pm10: null })).toBeNull();
  });
});
