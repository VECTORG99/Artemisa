import { describe, expect, it } from 'vitest';

import { render, screen } from '@/test/utils';

import { ContentSections, HeroSection } from './content-sections';
import { LandingModalProvider } from './landing-modal';

describe('HeroSection', () => {
  it('renders the translated hero title, cta and description', () => {
    render(<HeroSection />);

    expect(screen.getByRole('heading', { level: 1, name: 'Huascar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Generar configuración/ })).toBeInTheDocument();
    expect(
      screen.getByText(/Genera archivos de configuración para agentes de desarrollo y operación/),
    ).toBeInTheDocument();
  });
});

describe('ContentSections', () => {
  it('renders the translated final CTA section', () => {
    render(
      <LandingModalProvider>
        <ContentSections />
      </LandingModalProvider>,
    );

    expect(screen.getByRole('heading', { name: '¿Listo para configurar tu agente?' })).toBeInTheDocument();
    expect(
      screen.getByText('El creador te guía paso a paso hasta un bundle de archivos listo para copiar a tu proyecto.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Iniciar creador →' })).toBeInTheDocument();
  });
});
