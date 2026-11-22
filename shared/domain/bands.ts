export const BAND_KEYS = [
  'good',
  'satisfactory',
  'moderate',
  'poor',
  'veryPoor',
  'severe',
] as const;
export type BandKey = (typeof BAND_KEYS)[number];

export interface Band {
  key: BandKey;
  label: string;
  /** Position from 0 (best) to 5 (worst). */
  level: 0 | 1 | 2 | 3 | 4 | 5;
  min: number;
  max: number;
}

/** CPCB National AQI categories. */
export const BANDS: readonly Band[] = [
  { key: 'good', label: 'Good', level: 0, min: 0, max: 50 },
  { key: 'satisfactory', label: 'Satisfactory', level: 1, min: 51, max: 100 },
  { key: 'moderate', label: 'Moderate', level: 2, min: 101, max: 200 },
  { key: 'poor', label: 'Poor', level: 3, min: 201, max: 300 },
  { key: 'veryPoor', label: 'Very Poor', level: 4, min: 301, max: 400 },
  { key: 'severe', label: 'Severe', level: 5, min: 401, max: 500 },
];

export function bandForIndex(index: number): Band {
  const safe = Number.isFinite(index) ? Math.min(500, Math.max(0, Math.round(index))) : 0;
  return BANDS.find((band) => safe <= band.max) ?? (BANDS[5] as Band);
}
