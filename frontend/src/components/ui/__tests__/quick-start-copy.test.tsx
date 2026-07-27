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
    const textbox = screen.getByRole('textbox') as HTMLInputElement;
    expect(textbox.value).toMatch(/https:\/\/example\.com\/startup/);
    expect(textbox.value).toMatch(/Huascar/);
  });

  it('muestra el título "Inicio rapido: Pega en tu chat de IA"', () => {
    render(<QuickStartCopy url="https://example.com/startup" />);
    expect(screen.getByRole('heading', { name: /Inicio rapido: Pega en tu chat de IA/i })).toBeInTheDocument();
  });

  it('botón de copiar llama navigator.clipboard.writeText con el prompt completo', async () => {
    render(<QuickStartCopy url="https://example.com/startup" />);
    const button = screen.getByRole('button', { name: /copiar/i });
    fireEvent.click(button);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining('https://example.com/startup')));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Huascar')));
  });

  it('muestra feedback "¡Copiado!" al copiar', async () => {
    render(<QuickStartCopy url="https://example.com/startup" />);
    const button = screen.getByRole('button', { name: /copiar/i });
    fireEvent.click(button);
    await waitFor(() => expect(screen.getAllByText('¡Copiado!').length).toBeGreaterThanOrEqual(2));
  });

  it('es accesible (aria labels presentes)', () => {
    render(<QuickStartCopy url="https://example.com/startup" />);
    expect(screen.getByRole('button', { name: 'Copiar prompt de inicio rápido' })).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-readonly', 'true');
  });
});
