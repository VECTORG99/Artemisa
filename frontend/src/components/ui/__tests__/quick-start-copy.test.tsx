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

  it('renderiza el prompt con la URL', () => {
    render(<QuickStartCopy url="https://example.com/startup" />);
    const textbox = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textbox.value).toMatch(/https:\/\/example\.com\/startup/);
    expect(textbox.value).toMatch(/Huascar/);
  });

  it('muestra el título "Inicio Rápido: Pega en tu chat de IA" con tilde (#554)', () => {
    render(<QuickStartCopy url="https://example.com/startup" />);
    expect(screen.getByRole('heading', { name: /Inicio Rápido: Pega en tu chat de IA/i })).toBeInTheDocument();
  });

  it('renderiza el prompt completo en un textarea multilínea legible (#572)', () => {
    render(<QuickStartCopy url="https://example.com/startup" />);
    const textbox = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textbox.tagName).toBe('TEXTAREA');
    expect(textbox.rows).toBeGreaterThanOrEqual(2);
  });

  it('botón de copiar llama navigator.clipboard.writeText con el prompt completo', async () => {
    render(<QuickStartCopy url="https://example.com/startup" />);
    const button = screen.getByRole('button', { name: /copiar/i });
    fireEvent.click(button);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining('https://example.com/startup')));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Huascar')));
  });

  it('muestra feedback "¡Copiado!" una sola vez vía aria-live (#572)', async () => {
    render(<QuickStartCopy url="https://example.com/startup" />);
    const button = screen.getByRole('button', { name: /copiar/i });
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByText('¡Copiado!')).toBeInTheDocument());
    // El botón no cambia su etiqueta — sólo un canal de anuncio para SR.
    expect(screen.getAllByText('¡Copiado!')).toHaveLength(1);
    expect(button).toHaveAccessibleName('Copiar prompt de inicio rápido');
  });

  it('es accesible (aria labels presentes)', () => {
    render(<QuickStartCopy url="https://example.com/startup" />);
    expect(screen.getByRole('button', { name: 'Copiar prompt de inicio rápido' })).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-readonly', 'true');
  });
});
