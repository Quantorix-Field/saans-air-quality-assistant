// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  buildAdviceSystemPrompt,
  buildAskSystemPrompt,
  toContents,
  adviceUserText,
} from '../../server/prompts.js';
import type { AdviceFacts } from '../../shared/domain/advice.js';

const SAMPLE_FACTS: AdviceFacts = {
  language: 'English',
  airQualityIndex: 150,
  band: 'Poor',
  dominantPollutant: 'pm25',
  usAqi: 110,
  partialData: false,
  personalCautionTier: 3,
  cautionTierScale: '0 is relaxed, 5 is stay indoors',
  pm25Trend: 'steady',
  dataAgeHours: 1,
  who24hPm25Guideline: 15,
  bestWindows: [],
  profile: {
    ageGroup: 'adult',
    conditions: [],
    commuteMode: 'walk',
    hasPurifier: false,
    hasN95: false,
  },
  recommendedActions: [],
};

describe('buildAdviceSystemPrompt', () => {
  it('contains the facts JSON between markers', () => {
    const prompt = buildAdviceSystemPrompt(SAMPLE_FACTS);
    expect(prompt).toContain('=== FACTS START ===');
    expect(prompt).toContain(JSON.stringify(SAMPLE_FACTS));
    expect(prompt).toContain('=== FACTS END ===');
  });

  it('mentions Saans and plain text, no markdown', () => {
    const prompt = buildAdviceSystemPrompt(SAMPLE_FACTS);
    expect(prompt).toContain('Saans');
    expect(prompt).toContain('Plain text only');
  });

  it('says no doctor, no diagnosis', () => {
    const prompt = buildAdviceSystemPrompt(SAMPLE_FACTS);
    expect(prompt).toContain('not a doctor');
    expect(prompt).toContain('see a doctor');
  });

  it('contains summary and tips format instructions', () => {
    const prompt = buildAdviceSystemPrompt(SAMPLE_FACTS);
    expect(prompt).toContain('summary');
    expect(prompt).toContain('tips');
  });

  it('says the language from facts', () => {
    const prompt = buildAdviceSystemPrompt(SAMPLE_FACTS);
    expect(prompt).toContain('English');
  });

  it('says English for English facts and Hindi for Hindi facts', () => {
    const hindi = buildAdviceSystemPrompt({ ...SAMPLE_FACTS, language: 'Hindi' });
    expect(hindi).toContain('Hindi');
  });
});

describe('buildAskSystemPrompt', () => {
  it('contains facts but specifies 6 sentences max', () => {
    const prompt = buildAskSystemPrompt(SAMPLE_FACTS);
    expect(prompt).toContain('=== FACTS START ===');
    expect(prompt).toContain('6 sentences');
  });

  it('contains the untrusted data warning', () => {
    const prompt = buildAskSystemPrompt(SAMPLE_FACTS);
    expect(prompt).toContain('untrusted data');
  });
});

describe('toContents', () => {
  it('converts a simple user question', () => {
    const result = toContents([], 'What should I do?');
    expect(result).toEqual([{ role: 'user', parts: [{ text: 'What should I do?' }] }]);
  });

  it('maps assistant role to model', () => {
    // A non-leading assistant turn is preserved and mapped to model
    const result = toContents([{ role: 'user', text: 'Hi' }, { role: 'assistant', text: 'Stay indoors.' }], 'Why?');
    const modelTurn = result.find((c) => c.role === 'model');
    expect(modelTurn).toBeDefined();
    const userTurns = result.filter((c) => c.role === 'user');
    expect(userTurns.length).toBeGreaterThanOrEqual(1);
  });

  it('drops leading assistant turns', () => {
    const result = toContents(
      [{ role: 'assistant', text: 'Hello' }, { role: 'user', text: 'Hi' }],
      'Question',
    );
    // Leading assistant (would-be model) turn is dropped; first entry is user
    expect(result[0]?.role).toBe('user');
    // 'Hi' and 'Question' are consecutive user turns and get merged
    expect(result[0]?.parts[0]?.text).toBe('Hi\nQuestion');
  });

  it('merges consecutive same-role turns with newline', () => {
    const result = toContents(
      [{ role: 'user', text: 'First' }, { role: 'user', text: 'Second' }],
      'Third',
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.parts[0]?.text).toBe('First\nSecond\nThird');
  });

  it('removes control characters from all texts', () => {
    const result = toContents(
      [{ role: 'user', text: 'Hello\x00World' }],
      'Question\x01here',
    );
    expect(result[0]?.parts[0]?.text).not.toContain('\x00');
    const last = result[result.length - 1];
    expect(last?.parts[0]?.text).not.toContain('\x01');
  });

  it('never puts question text in system prompt material (toContents just returns contents)', () => {
    const question = 'SECRET_QUESTION_HERE';
    const contents = toContents([], question);
    // The question is in contents, not in system (toContents has no system context)
    const lastContent = contents[contents.length - 1];
    expect(lastContent?.parts[0]?.text).toBe(question);
  });
});

describe('adviceUserText', () => {
  it('returns different strings for English and Hindi', () => {
    const en = adviceUserText('English');
    const hi = adviceUserText('Hindi');
    expect(en).not.toBe(hi);
    expect(typeof en).toBe('string');
    expect(typeof hi).toBe('string');
    expect(en.length).toBeGreaterThan(0);
    expect(hi.length).toBeGreaterThan(0);
  });

  it('English version is in English script', () => {
    const en = adviceUserText('English');
    // Should contain common ASCII words
    expect(en).toMatch(/[a-zA-Z]/);
  });
});
