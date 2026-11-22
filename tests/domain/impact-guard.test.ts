import { describe, expect, it } from 'vitest';
import {
  activityForMode,
  commuteDoseChange,
  commuteImpact,
  kgCo2PerKm,
  litresPerKm,
} from '../../shared/domain/impact.js';
import { allowedNumbers, extractNumbers, passesNumberGuard } from '../../shared/domain/numberGuard.js';

describe('emission factors', () => {
  it('derives fuel modes from litres and economy', () => {
    expect(kgCo2PerKm('carPetrol')).toBeCloseTo(2.31 / 15, 6);
    expect(kgCo2PerKm('carDiesel')).toBeCloseTo(2.68 / 15, 6);
    expect(kgCo2PerKm('twoWheeler')).toBeCloseTo(2.31 / 45, 6);
  });
  it('uses fixed factors for the others', () => {
    expect(kgCo2PerKm('metro')).toBe(0.03);
    expect(kgCo2PerKm('bus')).toBe(0.05);
    expect(kgCo2PerKm('eTwoWheeler')).toBe(0.02);
    expect(kgCo2PerKm('walk')).toBe(0);
    expect(kgCo2PerKm('cycle')).toBe(0);
    expect(kgCo2PerKm('workFromHome')).toBe(0);
  });
  it('knows which modes burn fuel', () => {
    expect(litresPerKm('carPetrol')).toBeCloseTo(1 / 15, 6);
    expect(litresPerKm('carDiesel')).toBeCloseTo(1 / 15, 6);
    expect(litresPerKm('twoWheeler')).toBeCloseTo(1 / 45, 6);
    expect(litresPerKm('metro')).toBe(0);
  });
});

describe('commuteImpact', () => {
  it('shows what a car-to-metro switch saves in a month', () => {
    expect(commuteImpact({ km: 10, daysPerWeek: 5, from: 'carPetrol', to: 'metro' })).toEqual({
      monthlyKm: 433.3,
      fromKgPerMonth: 66.7,
      toKgPerMonth: 13,
      savedKgPerMonth: 53.7,
      savedLitresPerMonth: 28.9,
    });
  });
  it('handles a two-wheeler to bus switch', () => {
    const result = commuteImpact({ km: 10, daysPerWeek: 5, from: 'twoWheeler', to: 'bus' });
    expect(result.fromKgPerMonth).toBe(22.2);
    expect(result.toKgPerMonth).toBe(21.7);
    expect(result.savedKgPerMonth).toBe(0.6);
    expect(result.savedLitresPerMonth).toBe(9.6);
  });
  it('is zero for no change and negative for a worse choice', () => {
    expect(commuteImpact({ km: 8, daysPerWeek: 4, from: 'bus', to: 'bus' }).savedKgPerMonth).toBe(0);
    const worse = commuteImpact({ km: 10, daysPerWeek: 5, from: 'metro', to: 'carPetrol' });
    expect(worse.savedKgPerMonth).toBe(-53.7);
    expect(worse.savedLitresPerMonth).toBe(-28.9);
  });
  it('limits silly inputs', () => {
    expect(commuteImpact({ km: 500, daysPerWeek: 10, from: 'carPetrol', to: 'walk' }).monthlyKm).toBe(
      Math.round(200 * 2 * 7 * (52 / 12) * 10) / 10,
    );
    expect(commuteImpact({ km: Number.NaN, daysPerWeek: -3, from: 'carPetrol', to: 'walk' }).monthlyKm).toBe(0);
  });
});

describe('commute exposure', () => {
  it('maps modes to how hard the traveller breathes', () => {
    expect(activityForMode('walk')).toBe('walk');
    expect(activityForMode('cycle')).toBe('cycle');
    expect(activityForMode('metro')).toBe('rest');
    expect(activityForMode('carPetrol')).toBe('rest');
  });
  it('shows that cycling in dirty air raises the dose', () => {
    expect(commuteDoseChange(100, 30, 'carPetrol', 'cycle')).toEqual({ fromUg: 48, toUg: 210, deltaUg: 162 });
  });
  it('is lower for a child and zero in clean air', () => {
    expect(commuteDoseChange(100, 30, 'bus', 'walk', true).toUg).toBe(72);
    expect(commuteDoseChange(0, 30, 'bus', 'walk').deltaUg).toBe(0);
  });
});

describe('number guard', () => {
  const facts = { index: 232, pm25: 120.4, windows: [{ from: '18:00', to: '20:00' }] };

  it('extracts normalised numbers and skips names with digits', () => {
    expect(extractNumbers('PM2.5 at 45.0 ug, N95, MERV-13, NO2')).toEqual(['45']);
    expect(extractNumbers('२३२ and 2,5')).toEqual(['232', '2.5']);
  });
  it('collects every number from the facts', () => {
    const allowed = allowedNumbers(facts);
    for (const value of ['232', '120.4', '18', '20', '0']) expect(allowed.has(value)).toBe(true);
  });
  it('accepts answers that only repeat supplied numbers', () => {
    expect(passesNumberGuard('Index is 232 and PM2.5 is 120.4. Go at 18:00.', facts)).toBe(true);
  });
  it('rejects invented numbers', () => {
    expect(passesNumberGuard('Index is 300.', facts)).toBe(false);
    expect(passesNumberGuard('Index is 232, which is 75% worse.', facts)).toBe(false);
    expect(passesNumberGuard('Wait 13 minutes.', facts)).toBe(false);
  });
  it('allows small whole numbers', () => {
    expect(passesNumberGuard('Open windows for 10 minutes, wear 2 layers, 12 steps.', facts)).toBe(true);
  });
  it('treats equal numbers written differently as equal', () => {
    expect(passesNumberGuard('The index is 232.0.', facts)).toBe(true);
    expect(passesNumberGuard('सूचकांक २३२ है।', facts)).toBe(true);
    expect(passesNumberGuard('सूचकांक ३०० है।', facts)).toBe(false);
  });
  it('is not confused by product and pollutant names', () => {
    expect(passesNumberGuard('Use an N95 or FFP2, MERV-13 filters; PM10, NO2, SO2, O3 and CO2 matter.', {})).toBe(true);
  });
  it('rejects every number when no facts are given', () => {
    expect(passesNumberGuard('It is 50.', {})).toBe(false);
    expect(passesNumberGuard('No numbers here.', {})).toBe(true);
  });
});
