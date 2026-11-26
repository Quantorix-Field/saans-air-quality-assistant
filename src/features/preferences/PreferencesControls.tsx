import type { Theme, TextScale } from './usePreferences.js';
import type { Language } from '../../../shared/domain/types.js';
import { TEXT_SCALE_VALUES } from './prefs.js';

interface PreferencesControlsProps {
  theme: Theme;
  textScale: TextScale;
  motionOff: boolean;
  language: Language;
  onTheme: (t: Theme) => void;
  onTextScale: (s: TextScale) => void;
  onToggleMotion: () => void;
  onLanguage: (l: Language) => void;
}

const THEMES: { value: Theme; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const SCALES = [1, 2, 3, 4] as const;

function handleLanguageChange(
  e: React.ChangeEvent<HTMLSelectElement>,
  onLanguage: (l: Language) => void,
): void {
  const val = e.target.value;
  if (val === 'en' || val === 'hi') {
    onLanguage(val);
  }
}

export function PreferencesControls({
  theme,
  textScale,
  motionOff,
  language,
  onTheme,
  onTextScale,
  onToggleMotion,
  onLanguage,
}: PreferencesControlsProps) {
  const scaleIdx = SCALES.indexOf(textScale);

  return (
    <div className="footer-prefs">
      <fieldset style={{ border: 'none', padding: 0 }}>
        <legend className="visually-hidden">Theme</legend>
        <div className="segmented-group" role="group" aria-label="Theme">
          {THEMES.map(({ value, label }) => (
            <span key={value}>
              <input
                type="radio"
                name="theme"
                id={`theme-${value}`}
                value={value}
                checked={theme === value}
                onChange={() => onTheme(value)}
              />
              <label htmlFor={`theme-${value}`}>{label}</label>
            </span>
          ))}
        </div>
      </fieldset>

      <div className="text-size-controls" role="group" aria-label="Text size">
        <button
          type="button"
          onClick={() => onTextScale(SCALES[Math.max(0, scaleIdx - 1)] ?? 1)}
          disabled={textScale === 1}
        >
          Smaller text
        </button>
        <span
          aria-live="polite"
          aria-atomic="true"
          className="visually-hidden"
        >
          Text size {TEXT_SCALE_VALUES[textScale]}
        </span>
        <button
          type="button"
          onClick={() => onTextScale(SCALES[Math.min(SCALES.length - 1, scaleIdx + 1)] ?? 4)}
          disabled={textScale === 4}
        >
          Larger text
        </button>
      </div>

      <div className="language-control">
        <label htmlFor="lang-select">Language / भाषा</label>
        <select
          id="lang-select"
          value={language}
          onChange={(e) => handleLanguageChange(e, onLanguage)}
        >
          <option value="en">English</option>
          <option value="hi">हिन्दी</option>
        </select>
      </div>

      <button
        type="button"
        className="btn btn-ghost"
        style={{ padding: 'var(--space-2) var(--space-3)' }}
        aria-pressed={motionOff}
        onClick={onToggleMotion}
      >
        {motionOff ? 'Resume animations' : 'Pause animations'}
      </button>
    </div>
  );
}
