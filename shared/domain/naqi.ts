import { type Band, bandForIndex } from './bands.js';
import { type AirSeries, type HourlyPoint, POLLUTANTS, type Pollutant } from './types.js';

/** [concentration low, concentration high, index low, index high] per CPCB band. */
type Breakpoint = readonly [number, number, number, number];

/** CPCB breakpoints. Concentrations: ug/m3, except CO in mg/m3. */
const BREAKPOINTS: Record<Pollutant, readonly Breakpoint[]> = {
  pm25: [[0, 30, 0, 50], [31, 60, 51, 100], [61, 90, 101, 200], [91, 120, 201, 300], [121, 250, 301, 400], [251, 380, 401, 500]],
  pm10: [[0, 50, 0, 50], [51, 100, 51, 100], [101, 250, 101, 200], [251, 350, 201, 300], [351, 430, 301, 400], [431, 510, 401, 500]],
  no2: [[0, 40, 0, 50], [41, 80, 51, 100], [81, 180, 101, 200], [181, 280, 201, 300], [281, 400, 301, 400], [401, 500, 401, 500]],
  o3: [[0, 50, 0, 50], [51, 100, 51, 100], [101, 168, 101, 200], [169, 208, 201, 300], [209, 748, 301, 400], [749, 1000, 401, 500]],
  co: [[0, 1, 0, 50], [1.1, 2, 51, 100], [2.1, 10, 101, 200], [10.1, 17, 201, 300], [17.1, 34, 301, 400], [34.1, 50, 401, 500]],
  so2: [[0, 40, 0, 50], [41, 80, 51, 100], [81, 380, 101, 200], [381, 800, 201, 300], [801, 1600, 301, 400], [1601, 2000, 401, 500]],
};

/** How many trailing hours are averaged, and how many must be present. */
const AVERAGING: Record<Pollutant, { hours: number; minValid: number }> = {
  pm25: { hours: 24, minValid: 16 },
  pm10: { hours: 24, minValid: 16 },
  no2: { hours: 24, minValid: 16 },
  so2: { hours: 24, minValid: 16 },
  o3: { hours: 8, minValid: 6 },
  co: { hours: 8, minValid: 6 },
};

/** Sub-index (0-500) for one pollutant. CO must be given in mg/m3, the others in ug/m3. */
export function subIndex(pollutant: Pollutant, concentration: number): number {
  for (const [lo, hi, indexLo, indexHi] of BREAKPOINTS[pollutant]) {
    if (concentration <= hi) {
      const clamped = Math.max(concentration, lo);
      return indexLo + ((indexHi - indexLo) / (hi - lo)) * (clamped - lo);
    }
  }
  return 500;
}

/** Mean of the last `hours` values up to and including `endIndex`; null if too few are present. */
export function trailingMean(
  values: readonly (number | null)[],
  endIndex: number,
  hours: number,
  minValid: number,
): number | null {
  const slice = values.slice(Math.max(0, endIndex - hours + 1), endIndex + 1);
  const valid = slice.filter((value): value is number => value !== null && Number.isFinite(value));
  if (valid.length < minValid) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

export interface NaqiResult {
  index: number;
  band: Band;
  dominant: Pollutant;
  /** Rounded sub-index per pollutant that could be computed. */
  subIndices: Partial<Record<Pollutant, number>>;
  /** Averages used, in the units of the source data (ug/m3). */
  averages: Partial<Record<Pollutant, number>>;
  /** True when fewer than three pollutants were available. */
  partial: boolean;
}

/** CPCB National AQI for the current hour; null when no particulate data is available. */
export function computeNaqi(series: AirSeries): NaqiResult | null {
  const { hours, nowIndex } = series;
  if (nowIndex < 0 || nowIndex >= hours.length) return null;

  const subIndices: Partial<Record<Pollutant, number>> = {};
  const averages: Partial<Record<Pollutant, number>> = {};
  for (const pollutant of POLLUTANTS) {
    const { hours: window, minValid } = AVERAGING[pollutant];
    const mean = trailingMean(hours.map((hour) => hour[pollutant]), nowIndex, window, minValid);
    if (mean === null) continue;
    averages[pollutant] = mean;
    const concentration = pollutant === 'co' ? mean / 1000 : mean;
    subIndices[pollutant] = Math.round(subIndex(pollutant, concentration));
  }

  if (subIndices.pm25 === undefined && subIndices.pm10 === undefined) return null;

  let dominant: Pollutant = 'pm25';
  let highest = -1;
  for (const pollutant of POLLUTANTS) {
    const value = subIndices[pollutant];
    if (value !== undefined && value > highest) {
      highest = value;
      dominant = pollutant;
    }
  }
  return {
    index: highest,
    band: bandForIndex(highest),
    dominant,
    subIndices,
    averages,
    partial: Object.keys(subIndices).length < 3,
  };
}

/** Index of one hour from its own PM2.5 and PM10 only; used to compare hours for planning. */
export function hourlyIndex(point: HourlyPoint): number | null {
  const values = [
    point.pm25 === null ? null : subIndex('pm25', point.pm25),
    point.pm10 === null ? null : subIndex('pm10', point.pm10),
  ].filter((value): value is number => value !== null);
  return values.length === 0 ? null : Math.round(Math.max(...values));
}
