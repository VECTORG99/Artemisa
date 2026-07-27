import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Catalog, CreatorAnswers, Workflow } from '@artemisa/types';
import { FineTuningDashboard } from './fine-tuning-dashboard';

// SkillsBrowser / McpBrowser fetch their own catalogs; stub the API module so
// the dashboard renders without network access.
vi.mock('@/lib/api', () => ({
  creator: {
    getSkills: () => Promise.resolve({ version: '1.0.0', items: [] }),
    getMcps: () => Promise.resolve({ version: '1.0.0', items: [] }),
  },
}));

const catalog: Catalog = {
  version: '1.0.0',
  categories: [
    { id: 'cloud', label: 'Cloud', description: '', multiple: false },
    { id: 'agent-platform', label: 'Plataformas', description: '', multiple: true },
  ],
  items: [
    {
      id: 'aws-ec2',
      category: 'cloud',
      label: 'AWS EC2',
      description: 'Máquinas virtuales',
      tags: [],
      environments: ['production'],
      recommendedFor: [],
    },
    {
      id: 'vps',
      category: 'cloud',
      label: 'VPS',
      description: 'Servidor administrado por el equipo',
      tags: [],
      environments: ['production'],
      recommendedFor: [],
    },
    {
      id: 'artemisa',
      category: 'agent-platform',
      label: 'Artemisa',
      description: 'Formato nativo',
      tags: [],
      environments: ['development', 'production'],
      recommendedFor: [],
    },
    {
      id: 'kiro',
      category: 'agent-platform',
      label: 'Kiro',
      description: 'Steering y hooks',
      tags: [],
      environments: ['development'],
      recommendedFor: [],
    },
  ],
};

const workflow: Workflow = {
  version: '1.0.0',
  questions: [
    {
      id: 'agent_name',
      section: 'Identidad',
      prompt: '¿Cómo se llamará el agente?',
      description: 'Nombre corto.',
      type: 'text',
      required: true,
    },
    {
      id: 'purpose',
      section: 'Objetivo',
      prompt: '¿Qué problema principal resolverá?',
      description: 'Abre ramas especializadas.',
      type: 'select',
      required: true,
      options: [
        { id: 'pr-review', label: 'Revisión de pull requests', description: 'Analiza cambios.' },
        { id: 'coding', label: 'Desarrollo y mantenimiento', description: 'Implementa y refactoriza.' },
      ],
    },
    {
      id: 'environment',
      section: 'Entornos',
      prompt: '¿Dónde trabajará el agente?',
      description: 'Permisos distintos por entorno.',
      type: 'select',
      required: true,
      options: [
        { id: 'development', label: 'Sólo desarrollo', description: 'Código y herramientas.' },
        { id: 'production', label: 'Sólo producción', description: 'Entorno operacional.' },
      ],
    },
    {
      id: 'deployment_target',
      section: 'Producción',
      prompt: '¿Dónde se ejecuta la aplicación?',
      description: 'Destino de producción.',
      type: 'catalog-select',
      required: true,
      catalogCategories: ['cloud'],
      visibleWhen: { operator: 'oneOf', questionId: 'environment', values: ['production', 'both'] },
    },
    {
      id: 'agent_targets',
      section: 'Salida',
      prompt: '¿Para qué plataformas se generará la configuración?',
      description: 'Formatos de salida.',
      type: 'catalog-multiselect',
      required: true,
      catalogCategories: ['agent-platform'],
      maxSelections: 1,
    },
  ],
};

function renderDashboard(answers: CreatorAnswers, onChange = vi.fn(), onGenerate = vi.fn()) {
  render(
    <FineTuningDashboard
      answers={answers}
      onChange={onChange}
      onGenerate={onGenerate}
      generating={false}
      catalog={catalog}
      workflow={workflow}
    />,
  );
  return { onChange, onGenerate };
}

describe('FineTuningDashboard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows a loading state until the workflow contract arrives', () => {
    render(
      <FineTuningDashboard
        answers={{}}
        onChange={vi.fn()}
        onGenerate={vi.fn()}
        generating={false}
        catalog={null}
        workflow={null}
      />,
    );
    expect(screen.getByText(/Cargando contrato del workflow/i)).toBeInTheDocument();
  });

  it('renders select questions as option cards from the workflow, not free text', () => {
    renderDashboard({});
    // `purpose` must be a fixed choice — a text input here was the bug that
    // made every generate attempt fail backend validation.
    expect(screen.getByRole('radio', { name: /Revisión de pull requests/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Desarrollo y mantenimiento/i })).toBeInTheDocument();
  });

  it('writes the selected option id into answers', () => {
    const { onChange } = renderDashboard({});
    fireEvent.click(screen.getByRole('radio', { name: /Revisión de pull requests/i }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ purpose: 'pr-review' }));
  });

  it('hides conditional questions whose visibleWhen does not match', () => {
    renderDashboard({ environment: 'development' });
    fireEvent.click(screen.getByRole('button', { name: /Entornos/i }));
    expect(screen.queryByRole('radio', { name: /AWS EC2/i })).not.toBeInTheDocument();
  });

  it('reveals conditional questions once the branch is active', () => {
    renderDashboard({ environment: 'production' });
    fireEvent.click(screen.getByRole('button', { name: /Entornos/i }));
    expect(screen.getByRole('radio', { name: /AWS EC2/i })).toBeInTheDocument();
  });

  it('enforces maxSelections so the payload can never exceed the backend limit', () => {
    const { onChange } = renderDashboard({ agent_targets: ['artemisa'] });
    fireEvent.click(screen.getByRole('button', { name: /Salida/i }));
    // maxSelections is 1 and Artemisa is already chosen, so Kiro is blocked.
    const kiro = screen.getByRole('checkbox', { name: /Kiro/i });
    expect(kiro).toBeDisabled();
    fireEvent.click(kiro);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('allows deselecting a choice even when the maximum is reached', () => {
    const { onChange } = renderDashboard({ agent_targets: ['artemisa'] });
    fireEvent.click(screen.getByRole('button', { name: /Salida/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /^Artemisa/i }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ agent_targets: [] }));
  });

  it('keeps generate disabled while required questions are unanswered', () => {
    renderDashboard({});
    expect(screen.getByRole('button', { name: /Revisar y generar/i })).toBeDisabled();
    expect(screen.getByText(/Faltan 4 respuestas obligatorias/i)).toBeInTheDocument();
  });

  it('enables generate only when every visible required question is answered', () => {
    const { onGenerate } = renderDashboard({
      agent_name: 'Reviewer',
      purpose: 'pr-review',
      environment: 'development', // hides deployment_target
      agent_targets: ['artemisa'],
    });
    const button = screen.getByRole('button', { name: /Revisar y generar/i });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it('counts a conditional required question once its branch becomes visible', () => {
    renderDashboard({
      agent_name: 'Reviewer',
      purpose: 'pr-review',
      environment: 'production', // reveals deployment_target
      agent_targets: ['artemisa'],
    });
    expect(screen.getByRole('button', { name: /Revisar y generar/i })).toBeDisabled();
    expect(screen.getByText(/Faltan 1 respuesta obligatoria/i)).toBeInTheDocument();
  });
});
