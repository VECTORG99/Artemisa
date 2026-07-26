import { describe, expect, it } from 'vitest';

import { messages, useTranslations } from './index';

describe('useTranslations', () => {
  it('returns the common namespace', () => {
    expect(useTranslations('common')).toBe(messages.common);
  });

  it('returns the creator namespace', () => {
    expect(useTranslations('creator')).toBe(messages.creator);
  });

  it('returns the dashboard namespace with heading and subheading', () => {
    const dashboard = useTranslations('dashboard');
    expect(dashboard).toBe(messages.dashboard);
    expect(dashboard.heading).toBe('Huascar Builder');
    expect(dashboard.subheading).toBe('Panel de despliegue de agentes');
  });

  it('returns the landing namespace with hero and cta copy', () => {
    const landing = useTranslations('landing');
    expect(landing).toBe(messages.landing);
    expect(landing.heroTitle).toBe('Huascar');
    expect(landing.ctaButton).toBe('Iniciar creador →');
  });

  it('returns the same reference on repeated calls for a namespace', () => {
    expect(useTranslations('dashboard')).toBe(useTranslations('dashboard'));
  });
});
