import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const tokensPath = join(__dir, '../src/styles/tokens.css');
const css = readFileSync(tokensPath, 'utf-8');

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3
    ? h.split('').map((c) => c + c).join('')
    : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return [r, g, b];
}

function linearize(c8: number): number {
  const c = c8 / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function contrast(a: string, b: string): number {
  const la = relativeLuminance(parseHex(a));
  const lb = relativeLuminance(parseHex(b));
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

function extractVar(block: string, name: string): string {
  const re = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`);
  const m = block.match(re);
  if (!m || !m[1]) throw new Error(`Token --${name} not found`);
  return m[1];
}

// Extract light and dark blocks from CSS
const lightBlockMatch = css.match(/:root(?:\[data-theme="light"\])?\s*\{([^}]+)\}/s);
const darkBlockMatch = css.match(/:root\[data-theme="dark"\]\s*\{([^}]+)\}/s);

if (!lightBlockMatch) throw new Error('Light block not found in tokens.css');
if (!darkBlockMatch) throw new Error('Dark block not found in tokens.css');

const lightBlock = lightBlockMatch[1] ?? '';
const darkBlock = darkBlockMatch[1] ?? '';

describe('WCAG contrast – light theme', () => {
  const bg = extractVar(lightBlock, 'bg');
  const surface = extractVar(lightBlock, 'surface');
  const surface2 = extractVar(lightBlock, 'surface-2');
  const ink = extractVar(lightBlock, 'ink');
  const muted = extractVar(lightBlock, 'muted');
  const accent = extractVar(lightBlock, 'accent');
  const accentInk = extractVar(lightBlock, 'accent-ink');

  const bands = {
    good: extractVar(lightBlock, 'band-good'),
    satisfactory: extractVar(lightBlock, 'band-satisfactory'),
    moderate: extractVar(lightBlock, 'band-moderate'),
    poor: extractVar(lightBlock, 'band-poor'),
    veryPoor: extractVar(lightBlock, 'band-very-poor'),
    severe: extractVar(lightBlock, 'band-severe'),
  };

  it('ink / bg ≥ 4.5', () => { expect(contrast(ink, bg)).toBeGreaterThanOrEqual(4.5); });
  it('ink / surface ≥ 4.5', () => { expect(contrast(ink, surface)).toBeGreaterThanOrEqual(4.5); });
  it('ink / surface-2 ≥ 4.5', () => { expect(contrast(ink, surface2)).toBeGreaterThanOrEqual(4.5); });
  it('muted / bg ≥ 4.5', () => { expect(contrast(muted, bg)).toBeGreaterThanOrEqual(4.5); });
  it('muted / surface ≥ 4.5', () => { expect(contrast(muted, surface)).toBeGreaterThanOrEqual(4.5); });
  it('accent-ink / accent ≥ 4.5', () => { expect(contrast(accentInk, accent)).toBeGreaterThanOrEqual(4.5); });

  for (const [name, bandColor] of Object.entries(bands)) {
    it(`band ${name} / surface ≥ 3`, () => { expect(contrast(bandColor, surface)).toBeGreaterThanOrEqual(3); });
    it(`band ${name} / bg ≥ 3`, () => { expect(contrast(bandColor, bg)).toBeGreaterThanOrEqual(3); });
  }
});

describe('WCAG contrast – dark theme', () => {
  const bg = extractVar(darkBlock, 'bg');
  const surface = extractVar(darkBlock, 'surface');
  const surface2 = extractVar(darkBlock, 'surface-2');
  const ink = extractVar(darkBlock, 'ink');
  const muted = extractVar(darkBlock, 'muted');
  const accent = extractVar(darkBlock, 'accent');
  const accentInk = extractVar(darkBlock, 'accent-ink');

  const bands = {
    good: extractVar(darkBlock, 'band-good'),
    satisfactory: extractVar(darkBlock, 'band-satisfactory'),
    moderate: extractVar(darkBlock, 'band-moderate'),
    poor: extractVar(darkBlock, 'band-poor'),
    veryPoor: extractVar(darkBlock, 'band-very-poor'),
    severe: extractVar(darkBlock, 'band-severe'),
  };

  it('ink / bg ≥ 4.5', () => { expect(contrast(ink, bg)).toBeGreaterThanOrEqual(4.5); });
  it('ink / surface ≥ 4.5', () => { expect(contrast(ink, surface)).toBeGreaterThanOrEqual(4.5); });
  it('ink / surface-2 ≥ 4.5', () => { expect(contrast(ink, surface2)).toBeGreaterThanOrEqual(4.5); });
  it('muted / bg ≥ 4.5', () => { expect(contrast(muted, bg)).toBeGreaterThanOrEqual(4.5); });
  it('muted / surface ≥ 4.5', () => { expect(contrast(muted, surface)).toBeGreaterThanOrEqual(4.5); });
  it('accent-ink / accent ≥ 4.5', () => { expect(contrast(accentInk, accent)).toBeGreaterThanOrEqual(4.5); });

  for (const [name, bandColor] of Object.entries(bands)) {
    it(`band ${name} / surface ≥ 3`, () => { expect(contrast(bandColor, surface)).toBeGreaterThanOrEqual(3); });
    it(`band ${name} / bg ≥ 3`, () => { expect(contrast(bandColor, bg)).toBeGreaterThanOrEqual(3); });
  }
});
