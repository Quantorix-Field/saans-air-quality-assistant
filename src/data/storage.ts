import type { z } from 'zod';

const MAX_VALUE_BYTES = 50 * 1024;
const KEY_PREFIX = 'saans:';

/** Read and validate a JSON value from localStorage. Returns undefined for missing or corrupt data. */
export function readJson<T>(key: string, schema: z.ZodType<T>): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return undefined;
    const parsed: unknown = JSON.parse(raw);
    const result = schema.safeParse(parsed);
    if (!result.success) {
      localStorage.removeItem(key);
      return undefined;
    }
    return result.data;
  } catch {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    return undefined;
  }
}

/** Write a JSON value to localStorage. Rejects values over 50 KB. */
export function writeJson(key: string, value: unknown): void {
  try {
    const serialized = JSON.stringify(value);
    if (serialized.length > MAX_VALUE_BYTES) return;
    localStorage.setItem(key, serialized);
  } catch {
    // localStorage unavailable or full – silent fail
  }
}

/** Remove a key from localStorage. */
export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/** Remove every localStorage key starting with "saans:". */
export function clearAllSaansData(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(KEY_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) {
      localStorage.removeItem(k);
    }
  } catch {
    // ignore
  }
}
