import { describe, expect, it, vi } from 'vitest';

import { render, screen } from '@/test/utils';

import NotFound from './not-found';

// StarfieldBackground uses canvas/RAF; stub it to avoid jsdom noise.
vi.mock('@/components/backgrounds/starfield-background', () => ({
  StarfieldBackground: () => <div data-testid="starfield" />,
}));

describe('NotFound (branded 404)', () => {
  it('renders the 404 marker and a heading', () => {
    render(<NotFound />);

    expect(screen.getByText('Error 404')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
  });

  it('links back to the landing and the Creator', () => {
    render(<NotFound />);

    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Abrir el Creador' })).toHaveAttribute('href', '/agents/new');
  });

  it('describes removed routes without legacy hosting terminology', () => {
    render(<NotFound />);

    expect(screen.getByText(/genera archivos de configuración, no aloja agentes/i)).toBeInTheDocument();
    expect(screen.queryByText(/legacy|hosting/i)).not.toBeInTheDocument();
  });
});
