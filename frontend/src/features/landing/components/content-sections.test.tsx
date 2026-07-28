import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { render, screen } from '@/test/utils';

import { ContentSections, HeroSection, valueGlassStyle } from './content-sections';
import { LandingModalProvider } from './landing-modal';

describe('HeroSection', () => {
  it('renders the translated hero title, cta and description', () => {
    render(<HeroSection />);

    expect(screen.getByRole('heading', { level: 1, name: 'Artemisa' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Generar configuración/ })).toBeInTheDocument();
    expect(
      screen.getByText(/Configura agentes de desarrollo compatibles con 6\+ plataformas en minutos/),
    ).toBeInTheDocument();
  });
});

describe('ContentSections', () => {
  it('renders the three value propositions with updated copy', () => {
    render(
      <LandingModalProvider>
        <ContentSections />
      </LandingModalProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Árbol de decisiones determinista' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Recomendaciones con evidencia' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Compatible con 6+ plataformas' })).toBeInTheDocument();
    expect(screen.getByText(/Cursor, Devin, CodeRabbit, Kilo Code, Kiro/)).toBeInTheDocument();
  });

  it('renders the translated final CTA section', () => {
    render(
      <LandingModalProvider>
        <ContentSections />
      </LandingModalProvider>,
    );

    expect(screen.getByRole('heading', { name: '¿Listo para configurar tu agente?' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Responde 32 preguntas guiadas y obtén un bundle listo para Cursor, Devin, CodeRabbit, Kiro y más.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Iniciar creador →' })).toBeInTheDocument();
  });
});

// The liquid glass on the value cards only renders if two conditions hold in
// Chromium: the card carries its own backdrop-filter, and no ancestor is a
// backdrop root (another backdrop-filter surface, or `will-change: opacity`).
// Both regressions are invisible to a snapshot, hence these structural tests.
describe('value proposition liquid glass', () => {
  it('gives every value card its own backdrop blur', () => {
    render(
      <LandingModalProvider>
        <ContentSections />
      </LandingModalProvider>,
    );

    expect(screen.getAllByTestId('value-prop-card')).toHaveLength(3);
    expect(valueGlassStyle.backdropFilter).toMatch(/blur\(24px\)/);
    expect(valueGlassStyle.WebkitBackdropFilter).toMatch(/blur\(24px\)/);
  });

  it('does not nest the cards inside another backdrop-filter surface', () => {
    render(
      <LandingModalProvider>
        <ContentSections />
      </LandingModalProvider>,
    );

    // jsdom strips backdrop-filter from inline styles, so the guard checks the
    // rendered ancestors do not declare any of the glass style objects.
    for (const card of screen.getAllByTestId('value-prop-card')) {
      let ancestor = card.parentElement;
      while (ancestor) {
        expect(ancestor.getAttribute('style') ?? '').not.toMatch(/backdrop-filter|rgba\(255, 255, 255, 0\.06\)/);
        ancestor = ancestor.parentElement;
      }
    }
  });

  it('keeps opacity out of the fade-in wrapper will-change', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/globals.css'), 'utf8');
    const rule = /\.section-content\s*\{([^}]*)\}/.exec(css);

    expect(rule).not.toBeNull();
    expect(rule?.[1]).toMatch(/will-change:\s*transform;/);
    expect(rule?.[1]).not.toMatch(/will-change:[^;]*opacity/);
  });
});
