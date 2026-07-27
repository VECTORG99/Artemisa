import { describe, expect, it } from 'vitest';

import { render, screen } from '@/test/utils';

import { ContentSections, HeroSection } from './content-sections';
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
