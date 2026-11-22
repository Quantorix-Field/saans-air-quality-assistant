import { describe, expect, it } from 'vitest';
import { ASSUMPTION_LIST, BREATHING_LPM, MASK_PASS_FACTOR } from '../../shared/domain/assumptions.js';
import { BANDS, bandForIndex } from '../../shared/domain/bands.js';
import { compareDose, guidelineMultiple, inhaledDoseUg } from '../../shared/domain/dose.js';
import { personalTier, sensitivityShift } from '../../shared/domain/risk.js';

describe('bandForIndex', () => {
  const edges: [number, string][] = [
    [0, 'good'], [50, 'good'], [51, 'satisfactory'], [100, 'satisfactory'], [101, 'moderate'],
    [200, 'moderate'], [201, 'poor'], [300, 'poor'], [301, 'veryPoor'], [400, 'veryPoor'],
    [401, 'severe'], [500, 'severe'], [999, 'severe'], [-5, 'good'], [Number.NaN, 'good'],
  ];
  for (const [index, key] of edges) {
    it(`${index} is ${key}`, () => expect(bandForIndex(index).key).toBe(key));
  }
  it('rounds before choosing', () => expect(bandForIndex(50.4).key).toBe('good'));
  it('has contiguous, ordered bands', () => {
    BANDS.forEach((band, i) => {
      expect(band.level).toBe(i);
      if (i > 0) expect(band.min).toBe((BANDS[i - 1]?.max ?? 0) + 1);
    });
  });
});

describe('personal tier', () => {
  const adult = { ageGroup: 'adult', conditions: [] } as const;
  it('adds caution for age, pregnancy and chronic conditions, up to two steps', () => {
    expect(sensitivityShift(adult)).toBe(0);
    expect(sensitivityShift({ ageGroup: 'child', conditions: [] })).toBe(1);
    expect(sensitivityShift({ ageGroup: 'adult', conditions: ['pregnancy'] })).toBe(1);
    expect(sensitivityShift({ ageGroup: 'adult', conditions: ['asthmaCopd'] })).toBe(1);
    expect(sensitivityShift({ ageGroup: 'senior', conditions: ['heart'] })).toBe(2);
    expect(sensitivityShift({ ageGroup: 'child', conditions: ['asthmaCopd', 'heart'] })).toBe(2);
    expect(sensitivityShift({ ageGroup: 'adult', conditions: ['pregnancy', 'asthmaCopd'] })).toBe(2);
  });
  it('shifts the band level and stays within 0-5', () => {
    expect(personalTier(2, { ageGroup: 'child', conditions: [] })).toBe(3);
    expect(personalTier(5, { ageGroup: 'senior', conditions: ['heart'] })).toBe(5);
    expect(personalTier(0, adult)).toBe(0);
  });
});

describe('inhaled dose', () => {
  const base = { pm25: 100, activity: 'walk', minutes: 60, mask: 'none', isChild: false } as const;
  it('multiplies concentration, air breathed and time', () => {
    expect(inhaledDoseUg(base)).toBe(120);
    expect(inhaledDoseUg({ ...base, activity: 'rest' })).toBe(48);
    expect(inhaledDoseUg({ ...base, activity: 'run', minutes: 30 })).toBe(150);
  });
  it('is lower for children and with a mask', () => {
    expect(inhaledDoseUg({ ...base, isChild: true })).toBe(72);
    expect(inhaledDoseUg({ ...base, mask: 'n95' })).toBe(36);
  });
  it('never goes negative', () => {
    expect(inhaledDoseUg({ ...base, minutes: -10 })).toBe(0);
    expect(inhaledDoseUg({ ...base, pm25: -5 })).toBe(0);
  });
  it('states the guideline multiple', () => {
    expect(guidelineMultiple(75)).toBe(5);
    expect(guidelineMultiple(30)).toBe(2);
    expect(guidelineMultiple(0)).toBe(0);
  });
  it('compares now with a cleaner hour', () => {
    const { pm25: _unused, ...rest } = base;
    expect(compareDose(rest, 100, 25)).toEqual({ nowUg: 120, bestUg: 30, savedUg: 90, savedPercent: 75 });
    expect(compareDose(rest, 50, 50).savedPercent).toBe(0);
    expect(compareDose(rest, 20, 80).savedUg).toBe(0);
    expect(compareDose(rest, 0, 0).savedPercent).toBe(0);
  });
});

describe('assumptions', () => {
  it('lists every assumption once, with a note', () => {
    const ids = ASSUMPTION_LIST.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of ASSUMPTION_LIST) {
      expect(entry.label.length).toBeGreaterThan(0);
      expect(entry.value.length).toBeGreaterThan(0);
      expect(entry.note.length).toBeGreaterThan(0);
    }
  });
  it('keeps constants in sensible order', () => {
    expect(BREATHING_LPM.rest).toBeLessThan(BREATHING_LPM.walk);
    expect(BREATHING_LPM.walk).toBeLessThan(BREATHING_LPM.cycle);
    expect(BREATHING_LPM.cycle).toBeLessThan(BREATHING_LPM.run);
    expect(MASK_PASS_FACTOR.n95).toBeLessThan(MASK_PASS_FACTOR.surgical);
    expect(MASK_PASS_FACTOR.none).toBe(1);
  });
});
