import { describe, it, expect } from 'vitest';
import { en } from '../src/i18n/en.js';
import { hi } from '../src/i18n/hi.js';
import { translate } from '../src/i18n/index.js';

const enKeys = Object.keys(en).sort();
const hiKeys = Object.keys(hi).sort();

describe('i18n dictionaries', () => {
  it('en and hi have identical key sets', () => {
    expect(hiKeys).toEqual(enKeys);
  });

  it('no empty values in en', () => {
    for (const [key, val] of Object.entries(en)) {
      expect(val, `en key "${key}" is empty`).not.toBe('');
    }
  });

  it('no empty values in hi', () => {
    for (const [key, val] of Object.entries(hi)) {
      expect(val, `hi key "${key}" is empty`).not.toBe('');
    }
  });

  it('every {param} in en also appears in hi', () => {
    const paramRe = /\{(\w+)\}/g;
    for (const [key, enVal] of Object.entries(en)) {
      const enParams = [...enVal.matchAll(paramRe)].map((m) => m[1]).sort();
      const hiVal = hi[key as keyof typeof hi];
      const hiParams = [...hiVal.matchAll(paramRe)].map((m) => m[1]).sort();
      expect(hiParams, `key "${key}" param mismatch`).toEqual(enParams);
    }
  });
});

describe('translate()', () => {
  it('returns English text', () => {
    expect(translate('en', 'status.loading')).toBe('Loading…');
  });

  it('returns Hindi text', () => {
    expect(translate('hi', 'status.loading')).toBe('लोड हो रहा है…');
  });

  it('interpolates {param} placeholders', () => {
    const result = translate('en', 'status.stale', { hours: '5' });
    expect(result).toContain('5');
    expect(result).not.toContain('{hours}');
  });

  it('interpolates {param} in Hindi', () => {
    const result = translate('hi', 'status.stale', { hours: '5' });
    expect(result).toContain('5');
    expect(result).not.toContain('{hours}');
  });

  it('leaves text unchanged when no params given', () => {
    expect(translate('en', 'error.network')).toBe(en['error.network']);
  });
});
