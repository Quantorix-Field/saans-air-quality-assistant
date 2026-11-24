import { BAND_LABELS, type RenderedAction, renderAction } from './ruleText.js';
import type { BandKey } from './bands.js';
import { computeNaqi, type NaqiResult } from './naqi.js';
import { type RuleContext, evaluateRules } from './rules.js';
import { personalTier } from './risk.js';
import type { AirSeries, Language, Pollutant, Profile } from './types.js';
import { WHO_24H_GUIDELINE } from './assumptions.js';
import { dayOffset, findWindows, pm25Trend, type Trend, type WindowPick } from './windows.js';

const round1 = (value: number): number => Math.round(value * 10) / 10;
const clock = (hour: number): string => `${String(hour).padStart(2, '0')}:00`;

export interface FactWindow {
  day: 'today' | 'tomorrow' | 'later';
  from: string;
  to: string;
  pm25: number;
}

/** Everything the AI may say numbers from. Built only by our code from fetched data. */
export interface AdviceFacts {
  language: 'English' | 'Hindi';
  airQualityIndex: number;
  band: string;
  dominantPollutant: Pollutant;
  usAqi: number | null;
  partialData: boolean;
  personalCautionTier: number;
  cautionTierScale: string;
  pm25Trend: Trend;
  dataAgeHours: number;
  who24hPm25Guideline: number;
  bestWindows: FactWindow[];
  profile: {
    ageGroup: Profile['ageGroup'];
    conditions: readonly string[];
    commuteMode: Profile['commuteMode'];
    hasPurifier: boolean;
    hasN95: boolean;
  };
  recommendedActions: { title: string; why: string }[];
}

export interface AdviceBundle {
  context: RuleContext;
  actions: RenderedAction[];
  facts: AdviceFacts;
  summary: string;
  aqi: { index: number; band: BandKey; label: string; dominant: Pollutant; partial: boolean };
}

function toFactWindow(pick: WindowPick, today: string): FactWindow {
  const offset = dayOffset(today, pick.date);
  return {
    day: offset === 0 ? 'today' : offset === 1 ? 'tomorrow' : 'later',
    from: clock(pick.startHour),
    to: clock(pick.endHour),
    pm25: pick.meanPm25,
  };
}

const DAY_WORDS: Record<Language, Record<FactWindow['day'], string>> = {
  en: { today: 'today', tomorrow: 'tomorrow', later: 'later' },
  hi: { today: 'आज', tomorrow: 'कल', later: 'बाद में' },
};

/** Deterministic one-paragraph summary used when the AI is unavailable. */
export function rulesSummary(
  language: Language,
  label: string,
  index: number,
  tier: number,
  window: FactWindow | undefined,
): string {
  const head =
    language === 'hi'
      ? `अभी हवा ${label} है (सूचकांक ${index})। आपके लिए सावधानी स्तर 5 में से ${tier} है।`
      : `Air quality is ${label} right now (index ${index}). Your caution level is ${tier} out of 5.`;
  if (!window) return head;
  const day = DAY_WORDS[language][window.day];
  const tail =
    language === 'hi'
      ? ` बाहर जाने का सबसे अच्छा समय ${day} ${window.from} से ${window.to} है।`
      : ` The cleanest time to go out is ${window.from} to ${window.to} ${day}.`;
  return head + tail;
}

function makeContext(series: AirSeries, profile: Profile, naqi: NaqiResult, today: string, dataAgeHours: number): RuleContext {
  const { start, end } = profile.outdoorHours;
  const windows = findWindows(series.hours, series.nowIndex, { durationMinutes: 60, startHour: start, endHour: end });
  const cleanestHour =
    findWindows(series.hours, series.nowIndex, { durationMinutes: 60, startHour: 6, endHour: 22, maxResults: 1 })[0] ?? null;
  return {
    profile,
    naqi,
    tier: personalTier(naqi.band.level, profile),
    today,
    windows,
    cleanestHour,
    trend: pm25Trend(series.hours, series.nowIndex),
    dataAgeHours: round1(dataAgeHours),
  };
}

function makeFacts(context: RuleContext, usAqi: number | null, actions: RenderedAction[]): AdviceFacts {
  const { profile, naqi } = context;
  return {
    language: profile.language === 'hi' ? 'Hindi' : 'English',
    airQualityIndex: naqi.index,
    band: BAND_LABELS.en[naqi.band.key],
    dominantPollutant: naqi.dominant,
    usAqi,
    partialData: naqi.partial,
    personalCautionTier: context.tier,
    cautionTierScale: '0 is relaxed, 5 is stay indoors',
    pm25Trend: context.trend,
    dataAgeHours: context.dataAgeHours,
    who24hPm25Guideline: WHO_24H_GUIDELINE.pm25,
    bestWindows: context.windows.map((pick) => toFactWindow(pick, context.today)),
    profile: {
      ageGroup: profile.ageGroup,
      conditions: profile.conditions,
      commuteMode: profile.commuteMode,
      hasPurifier: profile.hasPurifier,
      hasN95: profile.hasN95,
    },
    recommendedActions: actions.map(({ title, why }) => ({ title, why })),
  };
}

/** Builds the rule context, the rule-based actions and the AI facts. Null when there is no particulate data. */
export function buildAdvice(series: AirSeries, profile: Profile, dataAgeHours: number): AdviceBundle | null {
  const naqi = computeNaqi(series);
  const nowTime = series.hours[series.nowIndex]?.time;
  if (!naqi || !nowTime) return null;

  const context = makeContext(series, profile, naqi, nowTime.slice(0, 10), dataAgeHours);
  const language = profile.language;
  const actions = evaluateRules(context, 6).map((action) =>
    renderAction(action, language, { index: naqi.index, band: naqi.band.key }),
  );
  const facts = makeFacts(context, series.usAqi, actions);
  const label = BAND_LABELS[language][naqi.band.key];
  return {
    context,
    actions,
    facts,
    summary: rulesSummary(language, label, naqi.index, context.tier, facts.bestWindows[0]),
    aqi: { index: naqi.index, band: naqi.band.key, label, dominant: naqi.dominant, partial: naqi.partial },
  };
}

/** Rule-based reply to a follow-up question: the summary and the top three actions. */
export function rulesAnswer(bundle: AdviceBundle): string {
  const top = bundle.actions.slice(0, 3).map((action) => `• ${action.title}`);
  return [bundle.summary, ...top].join('\n');
}
