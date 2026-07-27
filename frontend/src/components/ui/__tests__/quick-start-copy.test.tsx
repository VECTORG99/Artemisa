import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@/test/utils';
import { QuickStartCopy } from '../quick-start-copy';

const writeText = vi.fn().mockResolvedValue(undefined);

Object.defineProperty(globalThis.navigator, 'clipboard', {
  value: { writeText },
  writable: true,
  configurable: true,
});

describe('QuickStartCopy', () => {
  beforeEach(() => {
    writeText.mockClear();
  });

  it('renderiza la URL correcta', () => {
    render(<QuickStartCopy url="https://example.com/startup" />);
    expect(screen.getByRole('textbox')).toHaveValue('https://example.com/startup');
  });

  it('muestra el título "Inicio Rapido"', () => {
    render(<QuickStartCopy url="https://example.com/startup" />);
    expect(screen.getByRole('heading', { name: /Inicio Rapido/i })).toBeInTheDocument();
  });

  it('botón de copiar llama navigator.clipboard.writeText', async () => {
    render(<QuickStartCopy url="https://example.com/startup" />);
    const button = screen.getByRole('button', { name: /copiar/i });
    fireEvent.click(button);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('https://example.com/startup'));
  });

  it('muestra feedback "¡Copiado!" al copiar', async () => {
    render(<QuickStartCopy url="https://example.com/startup" />);
    const button = screen.getByRole('button', { name: /copiar/i });
    fireEvent.click(button);
    await waitFor(() => expect(screen.getAllByText('¡Copiado!').length).toBeGreaterThanOrEqual(2));
  });

  it('es accesible (aria labels presentes)', () => {
    render(<QuickStartCopy url="https://example.com/startup" />);
    expect(screen.getByRole('button', { name: 'Copiar URL de inicio rápido' })).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-readonly', 'true');
  });
});
