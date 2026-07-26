import { afterEach, describe, expect, it, vi } from 'vitest';

import { render, screen } from '@/test/utils';

import ErrorBoundary from './error';

vi.mock('@/components/backgrounds/starfield-background', () => ({
  StarfieldBackground: () => <div data-testid="starfield" />,
}));

const sampleError = new Error('boom') as Error & { digest?: string };
sampleError.digest = 'abc123';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ErrorBoundary (global error.tsx)', () => {
  it('renders a friendly heading and the error digest', () => {
    const reset = vi.fn();
    render(<ErrorBoundary error={sampleError} reset={reset} />);

    expect(screen.getByText('Error inesperado')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Algo salió mal' })).toBeInTheDocument();
    expect(screen.getByText('digest: abc123')).toBeInTheDocument();
  });

  it('offers retry and navigation links', () => {
    const reset = vi.fn();
    render(<ErrorBoundary error={sampleError} reset={reset} />);

    const retry = screen.getByRole('button', { name: 'Reintentar' });
    retry.click();
    expect(reset).toHaveBeenCalledTimes(1);

    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Abrir el Creador' })).toHaveAttribute('href', '/agents/new');
  });

  it('omits the digest line when the error has none', () => {
    render(<ErrorBoundary error={new Error('no digest')} reset={vi.fn()} />);
    expect(screen.queryByText(/^digest:/)).not.toBeInTheDocument();
  });
});
