import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { render, screen } from '@/test/utils';

import { ContentSections, HeroSection, techChipStyle, valueGlassStyle } from './content-sections';
import { glassNestedStyle, glassStyle, LandingModalProvider } from './landing-modal';
import { glassCard, glassNestedCard, glassPanel } from '@/lib/glass';

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
    expect(valueGlassStyle.backdropFilter).toMatch(/blur\(9px\)/);
    expect(valueGlassStyle.WebkitBackdropFilter).toMatch(/blur\(9px\)/);
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

// Issue #711: a `backdrop-filter` element is a backdrop root in Chromium, so
// glass nested inside glass samples its (empty) glass ancestor and the blur
// never rasterises — dead CSS advertising an effect that does not exist. These
// guards keep every landing surface at a single glass layer.
const BACKDROP_UTILITY = /(?:^|\s)(?:backdrop-blur|backdrop-saturate)[\w[\].%-]*/;

describe('landing glass layering', () => {
  function renderLanding() {
    return render(
      <LandingModalProvider>
        <ContentSections />
      </LandingModalProvider>,
    );
  }

  it('never nests a backdrop-filter utility inside another one', () => {
    const { container } = renderLanding();

    for (const element of container.querySelectorAll<HTMLElement>('*')) {
      if (!BACKDROP_UTILITY.test(element.className || '')) continue;
      let ancestor = element.parentElement;
      while (ancestor) {
        expect(BACKDROP_UTILITY.test(ancestor.className || '')).toBe(false);
        ancestor = ancestor.parentElement;
      }
    }
  });

  it('declares inline backdrop-filter only in the shared glassStyle constant', () => {
    // Every other landing component must reuse glassStyle (top-level surface)
    // or glassNestedStyle / techChipStyle (inside another glass surface).
    const componentsDir = resolve(process.cwd(), 'src/features/landing/components');
    const offenders = readdirSync(componentsDir)
      .filter((file) => file.endsWith('.tsx') && !file.endsWith('.test.tsx'))
      .filter((file) => file !== 'landing-modal.tsx')
      .filter((file) => /(?:Webkit)?[bB]ackdropFilter\s*:/.test(readFileSync(resolve(componentsDir, file), 'utf8')));

    expect(offenders).toEqual([]);
  });

  it('exposes a nested glass variant without blur', () => {
    expect(glassStyle.backdropFilter).toMatch(/blur\(9px\)/);
    expect(glassNestedStyle.backdropFilter).toBeUndefined();
    expect(glassNestedStyle.WebkitBackdropFilter).toBeUndefined();
    expect(glassNestedStyle.background).toBe(glassStyle.background);
    expect(glassNestedStyle.border).toBe(glassStyle.border);

    expect(glassCard()).toMatch(BACKDROP_UTILITY);
    expect(glassNestedCard()).not.toMatch(BACKDROP_UTILITY);
  });
});

describe('tech stack chips', () => {
  it('renders one chip per technology inside the section glass panel', () => {
    const { container } = render(
      <LandingModalProvider>
        <ContentSections />
      </LandingModalProvider>,
    );

    const chips = screen.getAllByTestId('tech-chip');
    expect(chips.length).toBeGreaterThan(0);

    // The chips live inside the section panel, which is the glass surface.
    expect(container.querySelector(`.${CSS.escape('backdrop-blur-[6px]')}`)).not.toBeNull();
    for (const chip of chips) {
      expect(chip.closest(`.${CSS.escape('backdrop-blur-[6px]')}`)).not.toBeNull();
    }
  });

  it('does not declare a backdrop-filter on the chip itself', () => {
    // jsdom strips backdrop-filter from inline styles, so the style object is
    // the only place where its absence can be asserted.
    expect(techChipStyle.backdropFilter).toBeUndefined();
    expect(techChipStyle.WebkitBackdropFilter).toBeUndefined();
    expect(techChipStyle.background).toBe('rgba(255,255,255,0.03)');
    expect(techChipStyle.border).toBe('1px solid rgba(255,255,255,0.08)');
  });

  it('keeps the glass panel as the single blur layer of the section', () => {
    expect(glassPanel()).toMatch(BACKDROP_UTILITY);
  });
});
