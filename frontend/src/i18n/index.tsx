'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import esMessages from './messages/es.json';
import enMessages from './messages/en.json';

// ─── Types ──────────────────────────────────────────────────────────────────

export type Locale = 'es' | 'en';

type Messages = typeof esMessages;
type Namespace = keyof Messages;

// ─── Messages map ───────────────────────────────────────────────────────────

const allMessages: Record<Locale, Messages> = {
  es: esMessages,
  en: enMessages as Messages,
};

// ─── Locale Context ─────────────────────────────────────────────────────────

const STORAGE_KEY = 'huascar-locale';
const DEFAULT_LOCALE: Locale = 'es';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Provides locale state to the entire app.
 * Persists user preference to localStorage under 'huascar-locale'.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'es') {
        setLocaleState(stored);
      }
    } catch {
      // localStorage may be unavailable
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
    } catch {
      // ignore
    }
    // Update the html lang attribute dynamically
    if (typeof document !== 'undefined') {
      document.documentElement.lang = newLocale;
    }
  }, []);

  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>;
}

/**
 * Returns current locale and a setter for switching languages.
 */
export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    // Fallback for usage outside provider (e.g. tests calling directly)
    return { locale: DEFAULT_LOCALE, setLocale: () => {} };
  }
  return ctx;
}

// ─── useTranslations ────────────────────────────────────────────────────────

/**
 * Minimal i18n hook. Returns messages for the given namespace in the active locale.
 * Falls back to Spanish ('es') if used outside LocaleProvider or outside React.
 */
export function useTranslations<T extends Namespace>(ns: T): Messages[T] {
  // Support being called outside React component tree (e.g. tests, utilities).
  // useContext will throw if there's no active React dispatcher.
  let locale: Locale = DEFAULT_LOCALE;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const ctx = useContext(LocaleContext);
    if (ctx) locale = ctx.locale;
  } catch {
    // Called outside React — fallback to default locale
  }
  return allMessages[locale][ns];
}

// Re-export for tests and external usage
export const messages = esMessages;
