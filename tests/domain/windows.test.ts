import { describe, expect, it } from 'vitest';
import {
  dayOffset,
  findWindows,
  pm25Trend,
  windowLengthHours,
  worstHours,
} from '../../shared/domain/windows.js';
import { makeHours } from './helpers.js';

/** 72 hours from 2026-11-20T00:00 with pm25 of 100, except where overridden by index. */
function hoursWith(overrides: Record<number, number | null>) {
  const hours = makeHours(72, { pm25: 100 });
  for (const [index, value] of Object.entries(overrides)) {
    const i = Number(index);
    hours[i] = { ...(hours[i] as (typeof hours)[number]), pm25: value };
  }
  return hours;
}

describe('windowLengthHours', () => {
  it('rounds up to whole hours between one and three', () => {
    expect(windowLengthHours(30)).toBe(1);
    expect(windowLengthHours(60)).toBe(1);
    expect(windowLengthHours(61)).toBe(2);
    expect(windowLengthHours(120)).toBe(2);
    expect(windowLengthHours(200)).toBe(3);
    expect(windowLengthHours(600)).toBe(3);
    expect(windowLengthHours(0)).toBe(1);
  });
});

describe('dayOffset', () => {
  it('counts whole calendar days', () => {
    expect(dayOffset('2026-11-20', '2026-11-20')).toBe(0);
    expect(dayOffset('2026-11-20', '2026-11-21')).toBe(1);
    expect(dayOffset('2026-11-30', '2026-12-01')).toBe(1);
    expect(dayOffset('2028-02-28', '2028-03-01')).toBe(2);
    expect(dayOffset('2026-11-20', '2026-11-19')).toBe(-1);
  });
});

describe('findWindows', () => {
  const options = { durationMinutes: 60, startHour: 5, endHour: 21 };

  it('returns the cleanest hours first, earliest first on ties', () => {
    const hours = hoursWith({ 6: 20, 7: 20, 5: 30 });
    const picks = findWindows(hours, 2, options);
    expect(picks.map((p) => p.startIndex)).toEqual([6, 7, 5]);
    expect(picks[0]).toEqual({
      startIndex: 6,
      endIndex: 6,
      date: '2026-11-20',
      startHour: 6,
      endHour: 7,
      meanPm25: 20,
    });
  });

  it('finds multi-hour windows that do not overlap', () => {
    const hours = hoursWith({ 6: 20, 7: 20, 5: 30 });
    const picks = findWindows(hours, 2, { ...options, durationMinutes: 120 });
    expect(picks[0]?.startIndex).toBe(6);
    expect(picks[0]?.endHour).toBe(8);
    expect(picks[0]?.meanPm25).toBe(20);
    for (let i = 1; i < picks.length; i += 1) {
      const a = picks[i - 1];
      const b = picks[i];
      expect(Boolean(a && b && (b.startIndex > a.endIndex || b.endIndex < a.startIndex))).toBe(true);
    }
    expect(picks.length).toBeLessThanOrEqual(3);
  });

  it('stays inside the allowed hours of the day', () => {
    const hours = hoursWith({ 3: 1, 4: 1, 22: 1, 23: 1 });
    const picks = findWindows(hours, 0, options);
    for (const pick of picks) {
      expect(pick.startHour).toBeGreaterThanOrEqual(5);
      expect(pick.endHour).toBeLessThanOrEqual(21);
    }
  });

  it('never starts before the current hour', () => {
    const hours = hoursWith({ 6: 1 });
    const picks = findWindows(hours, 8, options);
    expect(picks.every((p) => p.startIndex >= 8)).toBe(true);
  });

  it('skips hours with missing data', () => {
    const hours = hoursWith({ 6: null, 7: 10 });
    const picks = findWindows(hours, 0, options);
    expect(picks[0]?.startIndex).toBe(7);
    expect(picks.some((p) => p.startIndex === 6)).toBe(false);
  });

  it('can look into tomorrow', () => {
    const hours = hoursWith({ 31: 5 });
    const picks = findWindows(hours, 10, options);
    expect(picks[0]?.date).toBe('2026-11-21');
    expect(picks[0]?.startHour).toBe(7);
  });

  it('respects maxResults and returns nothing when no hour is allowed', () => {
    const hours = hoursWith({});
    expect(findWindows(hours, 0, { ...options, maxResults: 1 })).toHaveLength(1);
    expect(findWindows(hours, 0, { ...options, startHour: 10, endHour: 10 })).toEqual([]);
    expect(findWindows(hours, 500, options)).toEqual([]);
  });
});

describe('worstHours', () => {
  it('lists the dirtiest allowed hours from now on, worst first', () => {
    const hours = hoursWith({ 8: 300, 9: 250, 3: 999, 1: 888 });
    const picks = worstHours(hours, 2, 2, 5, 21);
    expect(picks.map((p) => p.index)).toEqual([8, 9]);
    expect(picks[0]).toEqual({ index: 8, date: '2026-11-20', hour: 8, pm25: 300 });
  });
  it('ignores missing values', () => {
    const hours = hoursWith({ 8: null });
    expect(worstHours(hours, 0, 100, 8, 9).every((p) => p.index !== 8)).toBe(true);
  });
});

describe('pm25Trend', () => {
  const series = (now: number, ahead: number) => {
    const hours = makeHours(40, { pm25: now });
    for (let i = 31; i <= 36; i += 1) hours[i] = { ...(hours[i] as (typeof hours)[number]), pm25: ahead };
    return hours;
  };
  it('detects improving, worsening and steady air', () => {
    expect(pm25Trend(series(100, 50), 30)).toBe('improving');
    expect(pm25Trend(series(40, 80), 30)).toBe('worsening');
    expect(pm25Trend(series(100, 95), 30)).toBe('steady');
  });
  it('ignores tiny absolute changes', () => {
    expect(pm25Trend(series(10, 14), 30)).toBe('steady');
    expect(pm25Trend(series(14, 10), 30)).toBe('steady');
  });
  it('is unknown without enough data', () => {
    expect(pm25Trend(series(100, 50), 38)).toBe('unknown');
    expect(pm25Trend(makeHours(40, { pm25: null }), 10)).toBe('unknown');
  });
});
