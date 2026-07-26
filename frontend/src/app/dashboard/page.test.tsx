import { beforeEach, describe, expect, it, vi } from 'vitest';

import { render, screen } from '@/test/utils';

import DashboardPage from './page';

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network disabled in test')));
  });

  it('renders the translated heading and subheading', () => {
    render(<DashboardPage />);

    expect(screen.getByRole('heading', { name: 'Huascar Builder' })).toBeInTheDocument();
    expect(screen.getByText('Panel de despliegue de agentes')).toBeInTheDocument();
  });

  it('links back to the landing and to the creator', () => {
    render(<DashboardPage />);

    expect(screen.getByRole('link', { name: 'Volver a la landing' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Crear un agente nuevo' })).toHaveAttribute('href', '/agents/new');
  });
});
