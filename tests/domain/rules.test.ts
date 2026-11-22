import { describe, expect, it } from 'vitest';
import { BAND_KEYS, BANDS } from '../../shared/domain/bands.js';
import type { NaqiResult } from '../../shared/domain/naqi.js';
import { personalTier } from '../../shared/domain/risk.js';
import { evaluateRules, RULE_COUNT, RULE_IDS, type RuleContext, type RuleId } from '../../shared/domain/rules.js';
import { BAND_LABELS, RULE_TEXT, renderAction } from '../../shared/domain/ruleText.js';
import type { Pollutant, Profile } from '../../shared/domain/types.js';
import type { WindowPick } from '../../shared/domain/windows.js';

const baseProfile: Profile = {
  ageGroup: 'adult',
  conditions: [],
  commuteMode: 'workFromHome',
  hasPurifier: false,
  hasN95: false,
  outdoorHours: { start: 5, end: 21 },
  language: 'en',
};

const todayWindow: WindowPick = { startIndex: 42, endIndex: 43, date: '2026-11-20', startHour: 18, endHour: 20, meanPm25: 40 };
const tomorrowWindow: WindowPick = { ...todayWindow, startIndex: 55, date: '2026-11-21', startHour: 7, endHour: 8 };

interface Overrides {
  profile?: Partial<Profile>;
  windows?: WindowPick[];
  cleanestHour?: WindowPick | null;
  trend?: RuleContext['trend'];
  dataAgeHours?: number;
  dominant?: Pollutant;
  partial?: boolean;
}

function ctx(level: number, o: Overrides = {}): RuleContext {
  const profile: Profile = { ...baseProfile, ...o.profile };
  const band = BANDS[level] ?? (BANDS[0] as (typeof BANDS)[number]);
  const naqi: NaqiResult = {
    index: band.min + 5,
    band,
    dominant: o.dominant ?? 'pm25',
    subIndices: {},
    averages: {},
    partial: o.partial ?? false,
  };
  return {
    profile,
    naqi,
    tier: personalTier(level, profile),
    today: '2026-11-20',
    windows: o.windows ?? [],
    cleanestHour: o.cleanestHour ?? null,
    trend: o.trend ?? 'steady',
    dataAgeHours: o.dataAgeHours ?? 0,
  };
}

const ids = (c: RuleContext): RuleId[] => evaluateRules(c, 100).map((a) => a.id);

/** Each rule: a context where it fires and one where it must not. */
const CASES: [RuleId, RuleContext, RuleContext][] = [
  ['red-flags', ctx(3), ctx(2)],
  ['stale-data', ctx(0, { dataAgeHours: 4 }), ctx(0, { dataAgeHours: 3 })],
  ['avoid-heavy-exercise', ctx(4), ctx(3)],
  ['child-indoor-play', ctx(2, { profile: { ageGroup: 'child' } }), ctx(2)],
  ['n95-wear', ctx(3, { profile: { hasN95: true } }), ctx(2, { profile: { hasN95: true } })],
  ['n95-get', ctx(3), ctx(3, { profile: { hasN95: true } })],
  ['purifier-on', ctx(2, { profile: { hasPurifier: true } }), ctx(1, { profile: { hasPurifier: true } })],
  ['inhaler-plan', ctx(2, { profile: { conditions: ['asthmaCopd'] } }), ctx(1, { profile: { conditions: ['asthmaCopd'] } })],
  ['closed-windows', ctx(2), ctx(1)],
  ['pregnancy-care', ctx(3, { profile: { conditions: ['pregnancy'] } }), ctx(2, { profile: { conditions: ['pregnancy'] } })],
  ['heart-care', ctx(3, { profile: { conditions: ['heart'] } }), ctx(2, { profile: { conditions: ['heart'] } })],
  ['go-out-today', ctx(1, { windows: [todayWindow] }), ctx(0, { windows: [todayWindow] })],
  ['go-out-tomorrow', ctx(1, { windows: [tomorrowWindow] }), ctx(1, { windows: [todayWindow] })],
  ['cyclist-route', ctx(3, { profile: { commuteMode: 'cycle' } }), ctx(2, { profile: { commuteMode: 'cycle' } })],
  ['senior-care', ctx(3, { profile: { ageGroup: 'senior' } }), ctx(2, { profile: { ageGroup: 'senior' } })],
  ['diy-filter-box', ctx(3), ctx(3, { profile: { hasPurifier: true } })],
  ['commute-switch', ctx(2, { profile: { commuteMode: 'carPetrol' } }), ctx(2, { profile: { commuteMode: 'metro' } })],
  ['no-burning', ctx(3), ctx(2)],
  ['reduce-exertion', ctx(3), ctx(4)],
  ['ventilate-cleanest', ctx(1, { cleanestHour: todayWindow }), ctx(1, { cleanestHour: tomorrowWindow })],
  ['trend-worsening', ctx(1, { trend: 'worsening' }), ctx(0, { trend: 'worsening' })],
  ['ozone-morning', ctx(2, { dominant: 'o3' }), ctx(2, { dominant: 'pm25' })],
  ['kitchen-exhaust', ctx(2), ctx(1)],
  ['wet-mop', ctx(2), ctx(1)],
  ['engine-off', ctx(2, { profile: { commuteMode: 'twoWheeler' } }), ctx(2, { profile: { commuteMode: 'bus' } })],
  ['trend-improving', ctx(2, { trend: 'improving' }), ctx(1, { trend: 'improving' })],
  ['partial-data', ctx(0, { partial: true }), ctx(0)],
  ['all-clear', ctx(1), ctx(2)],
  ['myth-plants', ctx(2), ctx(1)],
];

describe('rule engine', () => {
  it('has at least 20 rules, one per id', () => {
    expect(RULE_COUNT).toBeGreaterThanOrEqual(20);
    expect(RULE_COUNT).toBe(RULE_IDS.length);
    expect(CASES.map(([id]) => id).sort()).toEqual([...RULE_IDS].sort());
  });

  for (const [id, fires, quiet] of CASES) {
    it(`${id} fires when it should`, () => expect(ids(fires)).toContain(id));
    it(`${id} stays quiet when it should`, () => expect(ids(quiet)).not.toContain(id));
  }

  it('orders by priority and respects the limit', () => {
    const actions = evaluateRules(ctx(5, { profile: { ageGroup: 'child' } }), 100);
    for (let i = 1; i < actions.length; i += 1) {
      expect((actions[i - 1]?.priority ?? 0) >= (actions[i]?.priority ?? 0)).toBe(true);
    }
    expect(actions[0]?.id).toBe('red-flags');
    expect(evaluateRules(ctx(5), 3)).toHaveLength(3);
  });

  it('gives clean air a calm answer', () => {
    const found = ids(ctx(0));
    expect(found).toContain('all-clear');
    expect(found).not.toContain('red-flags');
    expect(found).not.toContain('closed-windows');
  });

  it('carries the numbers the text needs', () => {
    const [go] = evaluateRules(ctx(1, { windows: [todayWindow] }), 100).filter((a) => a.id === 'go-out-today');
    expect(go?.params).toEqual({ from: '18:00', to: '20:00' });
    const [stale] = evaluateRules(ctx(0, { dataAgeHours: 4.4 }), 100).filter((a) => a.id === 'stale-data');
    expect(stale?.params).toEqual({ hours: 4 });
    const [avoid] = evaluateRules(ctx(4), 100).filter((a) => a.id === 'avoid-heavy-exercise');
    expect(avoid?.params).toEqual({ tier: 4 });
  });

  it('writes midnight as 00:00', () => {
    const late: WindowPick = { ...todayWindow, startHour: 23, endHour: 24 };
    const [go] = evaluateRules(ctx(1, { windows: [late] }), 100).filter((a) => a.id === 'go-out-today');
    expect(go?.params).toEqual({ from: '23:00', to: '00:00' });
  });
});

describe('rule text', () => {
  const placeholders = (text: string): string[] => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? '').sort();

  it('covers every rule in both languages', () => {
    expect(Object.keys(RULE_TEXT.en).sort()).toEqual([...RULE_IDS].sort());
    expect(Object.keys(RULE_TEXT.hi).sort()).toEqual([...RULE_IDS].sort());
  });

  it('uses the same placeholders in English and Hindi', () => {
    for (const id of RULE_IDS) {
      expect(placeholders(RULE_TEXT.hi[id].title)).toEqual(placeholders(RULE_TEXT.en[id].title));
      expect(placeholders(RULE_TEXT.hi[id].why)).toEqual(placeholders(RULE_TEXT.en[id].why));
    }
  });

  it('writes Hindi in Devanagari', () => {
    for (const id of RULE_IDS) {
      expect(/[\u0900-\u097F]/.test(RULE_TEXT.hi[id].title)).toBe(true);
      expect(/[\u0900-\u097F]/.test(RULE_TEXT.hi[id].why)).toBe(true);
    }
  });

  it('labels every band in both languages', () => {
    for (const key of BAND_KEYS) {
      expect(BAND_LABELS.en[key].length).toBeGreaterThan(0);
      expect(BAND_LABELS.hi[key].length).toBeGreaterThan(0);
    }
  });

  it('fills every placeholder when rendering', () => {
    const params = { tier: 3, from: '06:00', to: '08:00', hours: 5 };
    for (const language of ['en', 'hi'] as const) {
      for (const id of RULE_IDS) {
        const rendered = renderAction({ id, category: 'info', priority: 1, params }, language, { index: 232, band: 'poor' });
        expect(rendered.title).not.toMatch(/\{\w+\}/);
        expect(rendered.why).not.toMatch(/\{\w+\}/);
      }
    }
  });

  it('puts the band, index and numbers into the sentence', () => {
    const en = renderAction({ id: 'avoid-heavy-exercise', category: 'outdoor', priority: 90, params: { tier: 4 } }, 'en', { index: 232, band: 'poor' });
    expect(en.why).toContain('Poor (index 232)');
    expect(en.why).toContain('4 of 5');
    const hi = renderAction({ id: 'go-out-today', category: 'outdoor', priority: 70, params: { from: '18:00', to: '20:00' } }, 'hi', { index: 120, band: 'moderate' });
    expect(hi.title).toContain('18:00');
    expect(hi.title).toContain('20:00');
  });

  it('leaves an unknown placeholder visible rather than hiding it', () => {
    const rendered = renderAction({ id: 'stale-data', category: 'info', priority: 95, params: {} }, 'en', { index: 1, band: 'good' });
    expect(rendered.title).toContain('{hours}');
  });
});
