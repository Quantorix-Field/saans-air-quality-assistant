import { createContext, useContext } from 'react';
import type { Language } from '../../shared/domain/types.js';
import { en } from './en.js';
import { hi } from './hi.js';

export type MessageKey = keyof typeof en;

const dictionaries: Record<Language, Record<MessageKey, string>> = { en, hi };

/**
 * Translate a message key, with optional {param} interpolation.
 * Unknown keys return the key itself so the UI never shows `undefined`.
 */
export function translate(
  language: Language,
  key: MessageKey,
  params?: Record<string, string>,
): string {
  const dict = dictionaries[language];
  let text: string = dict[key];
  if (!params) return text;
  for (const [name, value] of Object.entries(params)) {
    text = text.replaceAll(`{${name}}`, value);
  }
  return text;
}

interface I18nContextValue {
  language: Language;
  t: (key: MessageKey, params?: Record<string, string>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  language: 'en',
  t: (key, params) => translate('en', key, params),
});

export function I18nProvider({
  language,
  children,
}: {
  language: Language;
  children: React.ReactNode;
}) {
  const t = (key: MessageKey, params?: Record<string, string>) =>
    translate(language, key, params);

  return (
    <I18nContext.Provider value={{ language, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
