import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';

import { messages, useTranslations, useLocale, LocaleProvider } from './index';

describe('useTranslations', () => {
  it('returns the common namespace (defaults to es outside provider)', () => {
    expect(useTranslations('common')).toBe(messages.common);
  });

  it('returns the creator namespace', () => {
    expect(useTranslations('creator')).toBe(messages.creator);
  });

  it('returns the landing namespace with hero and cta copy', () => {
    const landing = useTranslations('landing');
    expect(landing).toBe(messages.landing);
    expect(landing.heroTitle).toBe('Huascar');
    expect(landing.ctaButton).toBe('Iniciar creador →');
  });

  it('returns the same reference on repeated calls for a namespace', () => {
    expect(useTranslations('creator')).toBe(useTranslations('creator'));
  });
});

describe('useLocale', () => {
  const wrapper = ({ children }: { children: ReactNode }) => <LocaleProvider>{children}</LocaleProvider>;

  it('defaults to es locale', () => {
    const { result } = renderHook(() => useLocale(), { wrapper });
    expect(result.current.locale).toBe('es');
  });

  it('switches locale to en', () => {
    const { result } = renderHook(() => useLocale(), { wrapper });
    act(() => {
      result.current.setLocale('en');
    });
    expect(result.current.locale).toBe('en');
  });

  it('returns fallback when used outside provider', () => {
    const { result } = renderHook(() => useLocale());
    expect(result.current.locale).toBe('es');
  });
});

describe('useTranslations with LocaleProvider', () => {
  const wrapper = ({ children }: { children: ReactNode }) => <LocaleProvider>{children}</LocaleProvider>;

  it('returns Spanish translations by default', () => {
    const { result } = renderHook(() => useTranslations('landing'), { wrapper });
    expect(result.current.heroTitle).toBe('Huascar');
    expect(result.current.ctaButton).toBe('Iniciar creador →');
  });

  it('returns English translations after switching locale', () => {
    const { result } = renderHook(() => ({ t: useTranslations('landing'), locale: useLocale() }), { wrapper });

    act(() => {
      result.current.locale.setLocale('en');
    });

    expect(result.current.t.heroTitle).toBe('Huascar');
    expect(result.current.t.ctaButton).toBe('Start creator →');
    expect(result.current.t.heroCta).toBe('Generate configuration');
  });
});
