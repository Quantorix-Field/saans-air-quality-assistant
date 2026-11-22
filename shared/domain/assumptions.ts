import type { Activity, Mask } from './types.js';

/**
 * Every constant behind an estimate lives here, with a plain-language note.
 * The "How we estimate" page lists ASSUMPTION_LIST, so nothing is hidden.
 */

/** WHO 2021 air quality guideline, 24-hour mean, ug/m3. */
export const WHO_24H_GUIDELINE = { pm25: 15, pm10: 45 } as const;

/** Litres of air breathed per minute (typical adult values, rounded). */
export const BREATHING_LPM: Record<Activity, number> = {
  rest: 8,
  walk: 20,
  cycle: 35,
  run: 50,
};

/** Children breathe less air in absolute terms. */
export const CHILD_BREATHING_FACTOR = 0.6;

/** Share of fine particles that still gets through, for a mask worn well. */
export const MASK_PASS_FACTOR: Record<Mask, number> = {
  none: 1,
  cloth: 0.85,
  surgical: 0.8,
  n95: 0.3,
};

export const FUEL = {
  petrolKgCo2PerLitre: 2.31,
  dieselKgCo2PerLitre: 2.68,
  carKmPerLitre: 15,
  twoWheelerKmPerLitre: 45,
} as const;

/** kg CO2e per passenger-km for modes that do not burn fuel in the vehicle itself. */
export const OTHER_KG_PER_KM = {
  bus: 0.05,
  metro: 0.03,
  eTwoWheeler: 0.02,
  walk: 0,
  cycle: 0,
  workFromHome: 0,
} as const;

export const WEEKS_PER_MONTH = 52 / 12;

/** Data older than this many hours is called out as stale. */
export const STALE_DATA_HOURS = 3;

export interface AssumptionEntry {
  id: string;
  label: string;
  value: string;
  note: string;
}

export const ASSUMPTION_LIST: readonly AssumptionEntry[] = [
  {
    id: 'who',
    label: 'WHO 24-hour guideline',
    value: 'PM2.5 15 ug/m3, PM10 45 ug/m3',
    note: 'WHO Global Air Quality Guidelines, 2021. Used to say how many times higher the air is.',
  },
  {
    id: 'breathing',
    label: 'Air breathed per minute',
    value: 'rest 8, walk 20, cycle 35, run 50 litres',
    note: 'Typical adult values, rounded. Children are scaled by 0.6. Your own figures will differ.',
  },
  {
    id: 'mask',
    label: 'Mask effect on fine particles',
    value: 'N95 lets 30% through, surgical 80%, cloth 85%',
    note: 'Assumes a well-fitted mask. A loose mask protects much less. Cloth and surgical masks filter fine PM poorly.',
  },
  {
    id: 'fuel',
    label: 'Fuel and CO2',
    value: 'petrol 2.31, diesel 2.68 kg CO2 per litre; car 15 km/L, two-wheeler 45 km/L',
    note: 'Round numbers for typical vehicles in India. Real figures depend on the vehicle and traffic.',
  },
  {
    id: 'transit',
    label: 'Public transport and electric',
    value: 'bus 0.05, metro 0.03, electric two-wheeler 0.02 kg CO2e per passenger-km',
    note: 'Illustrative averages for a typical trip. They vary by city and grid mix.',
  },
  {
    id: 'index',
    label: 'Air quality index',
    value: 'CPCB National AQI, computed from modelled data',
    note: 'Uses 24-hour averages (8-hour for ozone and CO) from the model. Official figures use ground sensors and can differ.',
  },
];
