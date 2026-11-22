import {
  BREATHING_LPM,
  CHILD_BREATHING_FACTOR,
  MASK_PASS_FACTOR,
  WHO_24H_GUIDELINE,
} from './assumptions.js';
import type { Activity, Mask } from './types.js';

const round1 = (value: number): number => Math.round(value * 10) / 10;

export interface DoseInput {
  /** PM2.5 in ug/m3. */
  pm25: number;
  activity: Activity;
  minutes: number;
  mask: Mask;
  isChild: boolean;
}

/** Estimated fine-particle dose breathed in, in micrograms. An estimate, not a measurement. */
export function inhaledDoseUg(input: DoseInput): number {
  const litres = BREATHING_LPM[input.activity] * (input.isChild ? CHILD_BREATHING_FACTOR : 1);
  const cubicMetres = (litres / 1000) * Math.max(0, input.minutes);
  return round1(Math.max(0, input.pm25) * cubicMetres * MASK_PASS_FACTOR[input.mask]);
}

/** How many times the WHO 24-hour PM2.5 guideline the air is. */
export function guidelineMultiple(pm25: number): number {
  return round1(Math.max(0, pm25) / WHO_24H_GUIDELINE.pm25);
}

export interface DoseComparison {
  nowUg: number;
  bestUg: number;
  savedUg: number;
  savedPercent: number;
}

/** Dose for the same activity now versus in a cleaner hour. */
export function compareDose(
  base: Omit<DoseInput, 'pm25'>,
  pm25Now: number,
  pm25Best: number,
): DoseComparison {
  const nowUg = inhaledDoseUg({ ...base, pm25: pm25Now });
  const bestUg = inhaledDoseUg({ ...base, pm25: pm25Best });
  const savedUg = Math.max(0, round1(nowUg - bestUg));
  const savedPercent = nowUg > 0 ? Math.max(0, Math.round((savedUg / nowUg) * 100)) : 0;
  return { nowUg, bestUg, savedUg, savedPercent };
}
