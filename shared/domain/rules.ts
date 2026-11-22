import { STALE_DATA_HOURS } from './assumptions.js';
import type { NaqiResult } from './naqi.js';
import type { CommuteMode, Profile } from './types.js';
import { dayOffset, type Trend, type WindowPick } from './windows.js';

export const RULE_IDS = [
  'red-flags',
  'stale-data',
  'avoid-heavy-exercise',
  'child-indoor-play',
  'n95-wear',
  'n95-get',
  'purifier-on',
  'inhaler-plan',
  'closed-windows',
  'pregnancy-care',
  'heart-care',
  'go-out-today',
  'go-out-tomorrow',
  'cyclist-route',
  'senior-care',
  'diy-filter-box',
  'commute-switch',
  'no-burning',
  'reduce-exertion',
  'ventilate-cleanest',
  'trend-worsening',
  'ozone-morning',
  'kitchen-exhaust',
  'wet-mop',
  'engine-off',
  'trend-improving',
  'partial-data',
  'all-clear',
  'myth-plants',
] as const;
export type RuleId = (typeof RULE_IDS)[number];

export type RuleCategory = 'outdoor' | 'indoor' | 'commute' | 'health' | 'community' | 'info';
export type ActionParams = Readonly<Record<string, string | number>>;

export interface Action {
  id: RuleId;
  category: RuleCategory;
  /** Higher means more important. */
  priority: number;
  params: ActionParams;
}

export interface RuleContext {
  profile: Profile;
  naqi: NaqiResult;
  /** Personal caution tier, 0-5. */
  tier: number;
  /** Local date "YYYY-MM-DD". */
  today: string;
  /** Cleanest windows inside the person's outdoor hours, best first. */
  windows: readonly WindowPick[];
  /** Cleanest single hour of the day (06:00-22:00), if any. */
  cleanestHour: WindowPick | null;
  trend: Trend;
  dataAgeHours: number;
}

interface Rule {
  id: RuleId;
  category: RuleCategory;
  priority: number;
  when: (context: RuleContext) => boolean;
  params?: (context: RuleContext) => ActionParams;
}

const FUEL_MODES: readonly CommuteMode[] = ['twoWheeler', 'carPetrol', 'carDiesel'];
const ACTIVE_MODES: readonly CommuteMode[] = ['walk', 'cycle'];

const level = (c: RuleContext): number => c.naqi.band.level;
const has = (c: RuleContext, condition: Profile['conditions'][number]): boolean =>
  c.profile.conditions.includes(condition);
const clock = (hour: number): string => `${String(hour % 24).padStart(2, '0')}:00`;
const hoursOf = (pick: WindowPick): ActionParams => ({
  from: clock(pick.startHour),
  to: clock(pick.endHour),
});
const bestWindowOffset = (c: RuleContext): number | null => {
  const best = c.windows[0];
  return best ? dayOffset(c.today, best.date) : null;
};

const RULES: readonly Rule[] = [
  { id: 'red-flags', category: 'health', priority: 100, when: (c) => level(c) >= 3 },
  {
    id: 'stale-data',
    category: 'info',
    priority: 95,
    when: (c) => c.dataAgeHours > STALE_DATA_HOURS,
    params: (c) => ({ hours: Math.round(c.dataAgeHours) }),
  },
  {
    id: 'avoid-heavy-exercise',
    category: 'outdoor',
    priority: 90,
    when: (c) => c.tier >= 4,
    params: (c) => ({ tier: c.tier }),
  },
  {
    id: 'child-indoor-play',
    category: 'health',
    priority: 88,
    when: (c) => c.profile.ageGroup === 'child' && c.tier >= 3,
    params: (c) => ({ tier: c.tier }),
  },
  { id: 'n95-wear', category: 'health', priority: 85, when: (c) => level(c) >= 3 && c.profile.hasN95 },
  { id: 'n95-get', category: 'health', priority: 84, when: (c) => level(c) >= 3 && !c.profile.hasN95 },
  { id: 'purifier-on', category: 'indoor', priority: 80, when: (c) => level(c) >= 2 && c.profile.hasPurifier },
  { id: 'inhaler-plan', category: 'health', priority: 78, when: (c) => has(c, 'asthmaCopd') && level(c) >= 2 },
  { id: 'closed-windows', category: 'indoor', priority: 75, when: (c) => level(c) >= 2 },
  { id: 'pregnancy-care', category: 'health', priority: 74, when: (c) => has(c, 'pregnancy') && level(c) >= 3 },
  { id: 'heart-care', category: 'health', priority: 72, when: (c) => has(c, 'heart') && level(c) >= 3 },
  {
    id: 'go-out-today',
    category: 'outdoor',
    priority: 70,
    when: (c) => level(c) >= 1 && bestWindowOffset(c) === 0,
    params: (c) => (c.windows[0] ? hoursOf(c.windows[0]) : {}),
  },
  {
    id: 'go-out-tomorrow',
    category: 'outdoor',
    priority: 64,
    when: (c) => level(c) >= 1 && (bestWindowOffset(c) ?? 0) >= 1,
    params: (c) => (c.windows[0] ? hoursOf(c.windows[0]) : {}),
  },
  {
    id: 'cyclist-route',
    category: 'commute',
    priority: 68,
    when: (c) => ACTIVE_MODES.includes(c.profile.commuteMode) && level(c) >= 3,
  },
  { id: 'senior-care', category: 'health', priority: 66, when: (c) => c.profile.ageGroup === 'senior' && level(c) >= 3 },
  {
    id: 'diy-filter-box',
    category: 'indoor',
    priority: 65,
    when: (c) => level(c) >= 3 && !c.profile.hasPurifier,
  },
  {
    id: 'commute-switch',
    category: 'commute',
    priority: 62,
    when: (c) => FUEL_MODES.includes(c.profile.commuteMode) && level(c) >= 2,
  },
  { id: 'no-burning', category: 'community', priority: 60, when: (c) => level(c) >= 3 },
  {
    id: 'reduce-exertion',
    category: 'outdoor',
    priority: 58,
    when: (c) => c.tier === 3,
    params: (c) => ({ tier: c.tier }),
  },
  {
    id: 'ventilate-cleanest',
    category: 'indoor',
    priority: 55,
    when: (c) => level(c) <= 1 && c.cleanestHour !== null && dayOffset(c.today, c.cleanestHour.date) === 0,
    params: (c) => (c.cleanestHour ? hoursOf(c.cleanestHour) : {}),
  },
  { id: 'trend-worsening', category: 'info', priority: 50, when: (c) => c.trend === 'worsening' && level(c) >= 1 },
  {
    id: 'ozone-morning',
    category: 'outdoor',
    priority: 45,
    when: (c) => c.naqi.dominant === 'o3' && level(c) >= 1,
  },
  { id: 'kitchen-exhaust', category: 'indoor', priority: 40, when: (c) => level(c) >= 2 },
  { id: 'wet-mop', category: 'indoor', priority: 35, when: (c) => level(c) >= 2 },
  {
    id: 'engine-off',
    category: 'commute',
    priority: 30,
    when: (c) => FUEL_MODES.includes(c.profile.commuteMode) && level(c) >= 2,
  },
  { id: 'trend-improving', category: 'info', priority: 32, when: (c) => c.trend === 'improving' && level(c) >= 2 },
  { id: 'partial-data', category: 'info', priority: 25, when: (c) => c.naqi.partial },
  { id: 'all-clear', category: 'outdoor', priority: 20, when: (c) => c.tier <= 1 },
  { id: 'myth-plants', category: 'info', priority: 10, when: (c) => level(c) >= 2 },
];

export const RULE_COUNT = RULES.length;

/** Every rule that applies right now, most important first (ties broken by id), at most `limit`. */
export function evaluateRules(context: RuleContext, limit = 8): Action[] {
  return RULES.filter((rule) => rule.when(context))
    .map((rule) => ({
      id: rule.id,
      category: rule.category,
      priority: rule.priority,
      params: rule.params ? rule.params(context) : {},
    }))
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
    .slice(0, limit);
}
