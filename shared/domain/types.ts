export const POLLUTANTS = ['pm25', 'pm10', 'no2', 'so2', 'o3', 'co'] as const;
export type Pollutant = (typeof POLLUTANTS)[number];

/** One hour of modelled air quality. Concentrations are in ug/m3. null means missing. */
export interface HourlyPoint {
  /** Local time, "YYYY-MM-DDTHH:MM". */
  time: string;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  so2: number | null;
  o3: number | null;
  co: number | null;
}

/** Hourly data covering the past day and the coming two days. */
export interface AirSeries {
  hours: readonly HourlyPoint[];
  /** Position of the current hour in `hours`. */
  nowIndex: number;
  usAqi: number | null;
}

export type Language = 'en' | 'hi';
export type AgeGroup = 'child' | 'adult' | 'senior';
export type Condition = 'asthmaCopd' | 'heart' | 'pregnancy';
export type CommuteMode =
  | 'walk'
  | 'cycle'
  | 'twoWheeler'
  | 'carPetrol'
  | 'carDiesel'
  | 'bus'
  | 'metro'
  | 'eTwoWheeler'
  | 'workFromHome';

export interface Profile {
  ageGroup: AgeGroup;
  conditions: readonly Condition[];
  commuteMode: CommuteMode;
  hasPurifier: boolean;
  hasN95: boolean;
  /** Hours of the day (0-24) when the person is happy to go outside. */
  outdoorHours: { start: number; end: number };
  language: Language;
}

export type Activity = 'rest' | 'walk' | 'cycle' | 'run';
export type Mask = 'none' | 'cloth' | 'surgical' | 'n95';
