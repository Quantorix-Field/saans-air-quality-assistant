export type Theme = 'system' | 'light' | 'dark';
export type TextScale = 1 | 2 | 3 | 4;

export interface Preferences {
  theme: Theme;
  textScale: TextScale;
  motionOff: boolean;
}

export const TEXT_SCALE_VALUES: Record<TextScale, string> = {
  1: '100%',
  2: '106%',
  3: '113%',
  4: '125%',
};

const STORAGE_KEY = 'saans:prefs';

const DEFAULTS: Preferences = {
  theme: 'system',
  textScale: 1,
  motionOff: false,
};

function isTheme(v: unknown): v is Theme {
  return v === 'system' || v === 'light' || v === 'dark';
}

function isTextScale(v: unknown): v is TextScale {
  return v === 1 || v === 2 || v === 3 || v === 4;
}

export function loadPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return { ...DEFAULTS };
    const p = parsed as Record<string, unknown>;
    return {
      theme: isTheme(p['theme']) ? p['theme'] : DEFAULTS.theme,
      textScale: isTextScale(p['textScale']) ? p['textScale'] : DEFAULTS.textScale,
      motionOff: typeof p['motionOff'] === 'boolean' ? p['motionOff'] : DEFAULTS.motionOff,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePreferences(prefs: Preferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage unavailable – silent fail
  }
}

export function applyPreferences(prefs: Preferences): void {
  const root = document.documentElement;
  root.setAttribute('data-theme', prefs.theme);
  root.setAttribute('data-motion', prefs.motionOff ? 'off' : 'on');
  root.style.fontSize = TEXT_SCALE_VALUES[prefs.textScale] ?? '100%';
}
