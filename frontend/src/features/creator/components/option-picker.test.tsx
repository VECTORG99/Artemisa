import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { OptionPicker, type PickerOption } from './option-picker';

function options(count: number): PickerOption[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `opt-${index}`,
    label: `Opción ${index}`,
    description: `Descripción ${index}`,
    tags: index === 0 ? ['especial'] : [],
  }));
}

describe('OptionPicker', () => {
  it('hides the search box for short lists', () => {
    render(<OptionPicker options={options(4)} multiple value={[]} onChange={vi.fn()} ariaLabel="Prueba" />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('shows a search box once the list is long, which the wizard previously lacked', () => {
    // `technologies` has 200+ catalog items; without search the guided flow was
    // unusable there.
    render(<OptionPicker options={options(30)} multiple value={[]} onChange={vi.fn()} ariaLabel="Tecnologías" />);
    expect(screen.getByLabelText('Buscar en Tecnologías')).toBeInTheDocument();
  });

  it('filters by label, id, description and tag', () => {
    render(<OptionPicker options={options(30)} multiple value={[]} onChange={vi.fn()} ariaLabel="Tecnologías" />);
    fireEvent.change(screen.getByLabelText('Buscar en Tecnologías'), { target: { value: 'especial' } });
    expect(screen.getByRole('checkbox', { name: /Opción 0/ })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Opción 1$/ })).not.toBeInTheDocument();
  });

  it('reports when a search matches nothing', () => {
    render(<OptionPicker options={options(30)} multiple value={[]} onChange={vi.fn()} ariaLabel="Tecnologías" />);
    fireEvent.change(screen.getByLabelText('Buscar en Tecnologías'), { target: { value: 'zzzz' } });
    expect(screen.getByText(/Sin resultados/)).toBeInTheDocument();
  });

  it('enforces maxSelections so /evaluate can never reject the payload', () => {
    const onChange = vi.fn();
    render(
      <OptionPicker
        options={options(4)}
        multiple
        max={2}
        value={['opt-0', 'opt-1']}
        onChange={onChange}
        ariaLabel="Prueba"
      />,
    );
    const blocked = screen.getByRole('checkbox', { name: /Opción 2/ });
    expect(blocked).toBeDisabled();
    fireEvent.click(blocked);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/Máximo de 2 alcanzado/)).toBeInTheDocument();
  });

  it('always allows deselecting, even at the maximum', () => {
    const onChange = vi.fn();
    render(
      <OptionPicker
        options={options(4)}
        multiple
        max={2}
        value={['opt-0', 'opt-1']}
        onChange={onChange}
        ariaLabel="Prueba"
      />,
    );
    fireEvent.click(screen.getByRole('checkbox', { name: /Opción 0/ }));
    expect(onChange).toHaveBeenCalledWith(['opt-1']);
  });

  it('replaces the value in single-select mode', () => {
    const onChange = vi.fn();
    render(<OptionPicker options={options(3)} multiple={false} value="opt-0" onChange={onChange} ariaLabel="Prueba" />);
    fireEvent.click(screen.getByRole('radio', { name: /Opción 2/ }));
    expect(onChange).toHaveBeenCalledWith('opt-2');
  });

  it('adds a custom: value from a free-text name', () => {
    // Documented in the README ("Todas las selecciones de catálogo aceptan
    // custom:<slug>") but previously unreachable from the UI.
    const onChange = vi.fn();
    render(
      <OptionPicker options={options(3)} multiple value={[]} onChange={onChange} ariaLabel="Prueba" allowCustom />,
    );
    fireEvent.click(screen.getByRole('button', { name: /No está en la lista/ }));
    fireEvent.change(screen.getByLabelText('Nombre de la opción personalizada'), {
      target: { value: 'Mi Herramienta Interna' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir' }));
    expect(onChange).toHaveBeenCalledWith(['custom:mi-herramienta-interna']);
  });

  it('keeps a chip for a selected value that is not in the option list', () => {
    render(
      <OptionPicker
        options={options(3)}
        multiple
        value={['custom:mi-tool']}
        onChange={vi.fn()}
        ariaLabel="Prueba"
        allowCustom
      />,
    );
    expect(screen.getByRole('button', { name: /Quitar Personalizado: mi tool/ })).toBeInTheDocument();
  });

  it('does not offer custom entries when the question does not accept them', () => {
    render(<OptionPicker options={options(3)} multiple value={[]} onChange={vi.fn()} ariaLabel="Prueba" />);
    expect(screen.queryByRole('button', { name: /No está en la lista/ })).not.toBeInTheDocument();
  });

  it('selects an option with its number key', () => {
    const onChange = vi.fn();
    render(
      <OptionPicker options={options(3)} multiple value={[]} onChange={onChange} ariaLabel="Prueba" enableNumberKeys />,
    );
    fireEvent.keyDown(window, { key: '2' });
    expect(onChange).toHaveBeenCalledWith(['opt-1']);
  });

  it('ignores number keys while typing in a field', () => {
    const onChange = vi.fn();
    render(
      <OptionPicker
        options={options(30)}
        multiple
        value={[]}
        onChange={onChange}
        ariaLabel="Tecnologías"
        enableNumberKeys
      />,
    );
    const search = screen.getByLabelText('Buscar en Tecnologías');
    fireEvent.keyDown(search, { key: '2' });
    expect(onChange).not.toHaveBeenCalled();
  });
});
