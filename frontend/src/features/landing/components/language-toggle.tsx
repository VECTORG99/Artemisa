'use client';

import { glassStyle } from './landing-modal';
import { useLocale, type Locale } from '@/i18n';

/**
 * Floating language toggle (bottom-right on every view).
 * Switches between Spanish (ES) and English (EN).
 * Persists via useLocale → localStorage 'artemisa-locale'.
 */
export function LanguageToggle() {
  const { locale, setLocale } = useLocale();

  const nextLocale: Locale = locale === 'es' ? 'en' : 'es';
  const label = locale === 'es' ? 'ES' : 'EN';
  const ariaLabel = locale === 'es' ? 'Cambiar idioma a inglés' : 'Switch language to Spanish';

  return (
    <button
      type="button"
      onClick={() => setLocale(nextLocale)}
      aria-label={ariaLabel}
      className="pointer-events-auto fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      style={glassStyle}
    >
      <span aria-hidden="true">🌐</span>
      <span>{label}</span>
    </button>
  );
}
