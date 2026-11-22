import { useState, useCallback } from 'react';
import {
  type Preferences,
  type Theme,
  type TextScale,
  loadPreferences,
  savePreferences,
  applyPreferences,
} from './prefs.js';

export type { Preferences, Theme, TextScale };

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(() => loadPreferences());

  const update = useCallback((next: Preferences) => {
    setPrefs(next);
    savePreferences(next);
    applyPreferences(next);
  }, []);

  const setTheme = useCallback(
    (theme: Theme) => update({ ...prefs, theme }),
    [prefs, update],
  );

  const setTextScale = useCallback(
    (textScale: TextScale) => update({ ...prefs, textScale }),
    [prefs, update],
  );

  const toggleMotion = useCallback(
    () => update({ ...prefs, motionOff: !prefs.motionOff }),
    [prefs, update],
  );

  return { prefs, setTheme, setTextScale, toggleMotion };
}
