import { FUEL, OTHER_KG_PER_KM, WEEKS_PER_MONTH } from './assumptions.js';
import { inhaledDoseUg } from './dose.js';
import type { Activity, CommuteMode } from './types.js';

const round1 = (value: number): number => Math.round(value * 10) / 10;
const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

/** kg CO2e per km travelled by one person. Estimates from the assumptions file. */
export function kgCo2PerKm(mode: CommuteMode): number {
  switch (mode) {
    case 'carPetrol':
      return FUEL.petrolKgCo2PerLitre / FUEL.carKmPerLitre;
    case 'carDiesel':
      return FUEL.dieselKgCo2PerLitre / FUEL.carKmPerLitre;
    case 'twoWheeler':
      return FUEL.petrolKgCo2PerLitre / FUEL.twoWheelerKmPerLitre;
    default:
      return OTHER_KG_PER_KM[mode];
  }
}

/** Litres of fuel burned per km. Zero for modes without a fuel tank of their own. */
export function litresPerKm(mode: CommuteMode): number {
  if (mode === 'carPetrol' || mode === 'carDiesel') return 1 / FUEL.carKmPerLitre;
  if (mode === 'twoWheeler') return 1 / FUEL.twoWheelerKmPerLitre;
  return 0;
}

export interface CommuteInput {
  /** One-way distance in km. */
  km: number;
  daysPerWeek: number;
  from: CommuteMode;
  to: CommuteMode;
}

export interface CommuteImpact {
  monthlyKm: number;
  fromKgPerMonth: number;
  toKgPerMonth: number;
  /** Negative when the new choice emits more. */
  savedKgPerMonth: number;
  savedLitresPerMonth: number;
}

/** What switching a regular commute changes in a month (return trips). */
export function commuteImpact(input: CommuteInput): CommuteImpact {
  const km = clamp(input.km, 0, 200);
  const days = clamp(input.daysPerWeek, 0, 7);
  const monthlyKm = km * 2 * days * WEEKS_PER_MONTH;
  const fromKg = kgCo2PerKm(input.from) * monthlyKm;
  const toKg = kgCo2PerKm(input.to) * monthlyKm;
  return {
    monthlyKm: round1(monthlyKm),
    fromKgPerMonth: round1(fromKg),
    toKgPerMonth: round1(toKg),
    savedKgPerMonth: round1(fromKg - toKg),
    savedLitresPerMonth: round1((litresPerKm(input.from) - litresPerKm(input.to)) * monthlyKm),
  };
}

/** How hard the traveller breathes: walking and cycling raise the dose, other modes are seated. */
export function activityForMode(mode: CommuteMode): Activity {
  if (mode === 'walk') return 'walk';
  if (mode === 'cycle') return 'cycle';
  return 'rest';
}

export interface CommuteDoseChange {
  fromUg: number;
  toUg: number;
  /** Positive means the new choice means breathing in more fine particles. */
  deltaUg: number;
}

/** Fine-particle dose for a day's return trip, same air for both modes. An estimate. */
export function commuteDoseChange(
  pm25: number,
  minutesOneWay: number,
  from: CommuteMode,
  to: CommuteMode,
  isChild = false,
): CommuteDoseChange {
  const dose = (mode: CommuteMode): number =>
    inhaledDoseUg({ pm25, activity: activityForMode(mode), minutes: minutesOneWay * 2, mask: 'none', isChild });
  const fromUg = dose(from);
  const toUg = dose(to);
  return { fromUg, toUg, deltaUg: round1(toUg - fromUg) };
}
