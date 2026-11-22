import type { HourlyPoint } from './types.js';

export interface WindowPick {
  startIndex: number;
  endIndex: number;
  /** Local date, "YYYY-MM-DD". */
  date: string;
  startHour: number;
  /** Exclusive end, so a window from 6 to 8 means 06:00 to 08:00. */
  endHour: number;
  meanPm25: number;
}

export interface WindowOptions {
  durationMinutes: number;
  /** Only hours of the day from startHour up to (not including) endHour are allowed. */
  startHour: number;
  endHour: number;
  maxResults?: number;
}

export interface HourPick {
  index: number;
  date: string;
  hour: number;
  pm25: number;
}

export type Trend = 'improving' | 'worsening' | 'steady' | 'unknown';

export const hourOf = (time: string): number => Number(time.slice(11, 13));
const dateOf = (time: string): string => time.slice(0, 10);
const round1 = (value: number): number => Math.round(value * 10) / 10;

/** Windows are whole hours, from one to three. */
export function windowLengthHours(durationMinutes: number): number {
  return Math.min(3, Math.max(1, Math.ceil(durationMinutes / 60)));
}

/** Whole days from `today` to `date`, both "YYYY-MM-DD". */
export function dayOffset(today: string, date: string): number {
  const toUtc = (value: string): number => {
    const [year, month, day] = value.split('-').map(Number);
    return Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  };
  return Math.round((toUtc(date) - toUtc(today)) / 86_400_000);
}

/** The cleanest non-overlapping windows from the current hour onwards, cleanest first. */
export function findWindows(
  hours: readonly HourlyPoint[],
  nowIndex: number,
  options: WindowOptions,
): WindowPick[] {
  const length = windowLengthHours(options.durationMinutes);
  const limit = options.maxResults ?? 3;
  const candidates: WindowPick[] = [];

  for (let start = Math.max(0, nowIndex); start + length <= hours.length; start += 1) {
    const block = hours.slice(start, start + length);
    let sum = 0;
    let allowed = true;
    for (const point of block) {
      const hour = hourOf(point.time);
      if (point.pm25 === null || !(hour >= options.startHour && hour < options.endHour)) {
        allowed = false;
        break;
      }
      sum += point.pm25;
    }
    const first = block[0];
    const last = block[length - 1];
    if (!allowed || !first || !last) continue;
    candidates.push({
      startIndex: start,
      endIndex: start + length - 1,
      date: dateOf(first.time),
      startHour: hourOf(first.time),
      endHour: hourOf(last.time) + 1,
      meanPm25: round1(sum / length),
    });
  }

  candidates.sort((a, b) => a.meanPm25 - b.meanPm25 || a.startIndex - b.startIndex);
  const picked: WindowPick[] = [];
  for (const candidate of candidates) {
    if (picked.length >= limit) break;
    if (picked.every((p) => candidate.startIndex > p.endIndex || candidate.endIndex < p.startIndex)) {
      picked.push(candidate);
    }
  }
  return picked;
}

/** The dirtiest hours from now onwards inside the allowed hours of the day, worst first. */
export function worstHours(
  hours: readonly HourlyPoint[],
  nowIndex: number,
  count: number,
  startHour: number,
  endHour: number,
): HourPick[] {
  const picks: HourPick[] = [];
  for (let index = Math.max(0, nowIndex); index < hours.length; index += 1) {
    const point = hours[index];
    if (!point || point.pm25 === null) continue;
    const hour = hourOf(point.time);
    if (hour >= startHour && hour < endHour) {
      picks.push({ index, date: dateOf(point.time), hour, pm25: point.pm25 });
    }
  }
  return picks.sort((a, b) => b.pm25 - a.pm25 || a.index - b.index).slice(0, count);
}

function meanOf(values: readonly (number | null)[], minValid: number): number | null {
  const valid = values.filter((value): value is number => value !== null);
  return valid.length < minValid ? null : valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

/**
 * Compares the next six hours with the last three (including now).
 * Improving or worsening needs a change of at least 20% and 5 ug/m3.
 */
export function pm25Trend(hours: readonly HourlyPoint[], nowIndex: number): Trend {
  const recent = meanOf(hours.slice(Math.max(0, nowIndex - 2), nowIndex + 1).map((h) => h.pm25), 2);
  const ahead = meanOf(hours.slice(nowIndex + 1, nowIndex + 7).map((h) => h.pm25), 3);
  if (recent === null || ahead === null) return 'unknown';
  if (ahead <= recent * 0.8 && recent - ahead >= 5) return 'improving';
  if (ahead >= recent * 1.2 && ahead - recent >= 5) return 'worsening';
  return 'steady';
}
