/**
 * AI answers may only repeat numbers that our code supplied. Every other number is rejected.
 * Small whole numbers up to 12 are always allowed (steps, "10 minutes", times like 06:00).
 */

const DEVANAGARI_ZERO = 0x0966;
const SMALL_INTEGER_LIMIT = 12;

/** Names that contain digits but are not quantities. */
const NAMES_WITH_DIGITS = /\b(?:PM\s?2\.5|PM\s?10|NO2|SO2|O3|CO2|N95|FFP2|MERV-?13)\b/gi;

function toAsciiDigits(text: string): string {
  return text.replace(/[\u0966-\u096F]/g, (digit) =>
    String(digit.charCodeAt(0) - DEVANAGARI_ZERO),
  );
}

/** Numbers found in a text, normalised so "15.0", "15" and "१५" are the same. */
export function extractNumbers(text: string): string[] {
  const cleaned = toAsciiDigits(text).replace(NAMES_WITH_DIGITS, ' ');
  const found = cleaned.match(/\d+(?:[.,]\d+)?/g) ?? [];
  return found.map((token) => String(Number(token.replace(',', '.'))));
}

/** The numbers that appear anywhere in the facts we gave the model. */
export function allowedNumbers(facts: unknown): Set<string> {
  return new Set(extractNumbers(JSON.stringify(facts)));
}

export function passesNumberGuard(answer: string, facts: unknown): boolean {
  const allowed = allowedNumbers(facts);
  return extractNumbers(answer).every((value) => {
    const asNumber = Number(value);
    const small = Number.isInteger(asNumber) && asNumber <= SMALL_INTEGER_LIMIT;
    return small || allowed.has(value);
  });
}
