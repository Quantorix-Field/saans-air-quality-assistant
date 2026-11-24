import { describe, expect, it } from 'vitest';
import { buildAdvice, rulesAnswer, rulesSummary } from '../../shared/domain/advice.js';
import { passesNumberGuard } from '../../shared/domain/numberGuard.js';
import type { AirSeries, Profile } from '../../shared/domain/types.js';
import { makeHours, makeSeries } from './helpers.js';

const profile: Profile = {
  ageGroup: 'adult',
  conditions: [],
  commuteMode: 'metro',
  hasPurifier: false,
  hasN95: false,
  outdoorHours: { start: 5, end: 21 },
  language: 'en',
};

/** Hours are 2026-11-20 onwards; index 30 is 2026-11-21 06:00. */
function withClean(count: number, cleanIndex: number): AirSeries {
  const hours = makeHours(count).map((hour, index) => ({ ...hour, pm25: index === cleanIndex ? 5 : 100 }));
  return { hours, nowIndex: 30, usAqi: 150 };
}

describe('buildAdvice', () => {
  it('builds facts, actions and a summary from real air data', () => {
    const bundle = buildAdvice(makeSeries(), profile, 0.44);
    expect(bundle).not.toBeNull();
    if (!bundle) return;
    expect(bundle.aqi.band).toBe('good');
    expect(bundle.aqi.index).toBe(bundle.context.naqi.index);
    expect(bundle.facts.band).toBe('Good');
    expect(bundle.facts.language).toBe('English');
    expect(bundle.facts.airQualityIndex).toBe(bundle.aqi.index);
    expect(bundle.facts.who24hPm25Guideline).toBe(15);
    expect(bundle.facts.dataAgeHours).toBe(0.4);
    expect(bundle.facts.bestWindows.length).toBeGreaterThan(0);
    expect(bundle.actions.length).toBeGreaterThan(0);
    expect(bundle.facts.recommendedActions).toHaveLength(bundle.actions.length);
    expect(bundle.summary).toContain('Good');
    expect(bundle.summary).toContain(String(bundle.aqi.index));
  });

  it('keeps coordinates and raw hourly data out of the facts', () => {
    const bundle = buildAdvice(makeSeries(), profile, 0);
    const text = JSON.stringify(bundle?.facts);
    expect(text).not.toContain('latitude');
    expect(text).not.toContain('2026-11');
    expect(text).not.toContain('"hours"');
  });

  it('labels the best window as today, tomorrow or later', () => {
    const tomorrow = buildAdvice(withClean(96, 55), profile, 0)?.facts.bestWindows[0];
    expect(tomorrow).toEqual({ day: 'tomorrow', from: '07:00', to: '08:00', pm25: 5 });
    const later = buildAdvice(withClean(96, 79), profile, 0)?.facts.bestWindows[0];
    expect(later?.day).toBe('later');
    const today = buildAdvice(withClean(96, 33), profile, 0)?.facts.bestWindows[0];
    expect(today?.day).toBe('today');
  });

  it('writes the summary in Hindi when asked', () => {
    const bundle = buildAdvice(makeSeries(), { ...profile, language: 'hi' }, 0);
    expect(bundle?.facts.language).toBe('Hindi');
    expect(bundle?.summary).toContain('अभी हवा');
    expect(bundle?.aqi.label).toBe('अच्छा');
  });

  it('raises the personal tier for sensitive people', () => {
    const adult = buildAdvice(withClean(96, 55), profile, 0);
    const child = buildAdvice(withClean(96, 55), { ...profile, ageGroup: 'child', conditions: ['asthmaCopd'] }, 0);
    expect(child?.context.tier).toBe((adult?.context.tier ?? 0) + 2);
  });

  it('returns null without particulate data or with a bad position', () => {
    expect(buildAdvice(makeSeries(72, 30, { pm25: null, pm10: null }), profile, 0)).toBeNull();
    expect(buildAdvice(makeSeries(72, 99), profile, 0)).toBeNull();
  });

  it('only contains numbers that its own facts allow', () => {
    const bundle = buildAdvice(withClean(96, 55), profile, 1);
    expect(bundle).not.toBeNull();
    if (!bundle) return;
    expect(passesNumberGuard(bundle.summary, bundle.facts)).toBe(true);
    expect(passesNumberGuard(rulesAnswer(bundle), bundle.facts)).toBe(true);
  });
});

describe('rulesSummary', () => {
  it('works without a window in both languages', () => {
    expect(rulesSummary('en', 'Poor', 250, 4, undefined)).toBe(
      'Air quality is Poor right now (index 250). Your caution level is 4 out of 5.',
    );
    expect(rulesSummary('hi', 'खराब', 250, 4, undefined)).toContain('250');
  });

  it('adds the cleanest time when there is one', () => {
    const window = { day: 'tomorrow', from: '07:00', to: '08:00', pm25: 5 } as const;
    expect(rulesSummary('en', 'Poor', 250, 4, window)).toContain('07:00 to 08:00 tomorrow');
    expect(rulesSummary('hi', 'खराब', 250, 4, window)).toContain('कल');
  });
});

describe('rulesAnswer', () => {
  it('joins the summary with the top three action titles', () => {
    const bundle = buildAdvice(withClean(96, 55), profile, 0);
    const lines = bundle ? rulesAnswer(bundle).split('\n') : [];
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.length).toBeLessThanOrEqual(4);
    expect(lines[1]?.startsWith('• ')).toBe(true);
  });
});
