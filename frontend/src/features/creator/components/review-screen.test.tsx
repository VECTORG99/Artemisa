import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Catalog, CreatorRecommendation, Workflow } from '@huascar/types';
import { ReviewScreen } from './review-screen';

const catalog: Catalog = {
  version: '1.0.0',
  categories: [
    { id: 'language', label: 'Lenguajes', description: '', multiple: true },
    { id: 'agent-platform', label: 'Plataformas', description: '', multiple: true },
  ],
  items: [
    {
      id: 'typescript',
      category: 'language',
      label: 'TypeScript',
      description: 'Tipado estático para JavaScript',
      tags: [],
      environments: ['development'],
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
      description: '',
      type: 'text',
      required: true,
    },
    {
      id: 'technologies',
      section: 'Stack',
      prompt: 'Selecciona las tecnologías del proyecto',
      description: '',
      type: 'catalog-multiselect',
      required: true,
      catalogCategories: ['language'],
    },
    {
      id: 'pr_review_enabled',
      section: 'Pull requests',
      prompt: '¿Debe incluir una configuración especializada de PR review?',
      description: '',
      type: 'boolean',
      required: true,
    },
    {
      id: 'agent_targets',
      section: 'Salida',
      prompt: '¿Para qué plataformas se generará la configuración?',
      description: '',
      type: 'catalog-multiselect',
      required: true,
      catalogCategories: ['agent-platform'],
    },
  ],
};

const recommendation: CreatorRecommendation = {
  id: 'least-privilege',
  severity: 'warning',
  title: 'Aplica mínimo privilegio',
  reason: 'El agente declara capacidades de escritura.',
  evidence: ['capabilities=edit-code'],
  benefits: ['Reduce el radio de impacto de un error'],
  tradeoffs: ['Requiere aprobación humana explícita'],
  alternatives: ['Modo sólo lectura'],
};

function renderReview(overrides: Partial<React.ComponentProps<typeof ReviewScreen>> = {}) {
  const onGenerate = vi.fn();
  const onEditAnswer = vi.fn();
  render(
    <ReviewScreen
      answers={{
        agent_name: 'reviewer',
        technologies: ['typescript'],
        pr_review_enabled: true,
        agent_targets: ['kiro'],
      }}
      workflow={workflow}
      catalog={catalog}
      recommendations={[recommendation]}
      warnings={[]}
      issues={[]}
      onGenerate={onGenerate}
      onEditAnswer={onEditAnswer}
      generating={false}
      {...overrides}
    />,
  );
  return { onGenerate, onEditAnswer };
}

describe('ReviewScreen', () => {
  it('labels answers with the question prompt instead of the internal id (issue #435)', () => {
    renderReview();
    expect(screen.getByText('¿Debe incluir una configuración especializada de PR review?')).toBeInTheDocument();
    expect(screen.queryByText('pr_review_enabled')).not.toBeInTheDocument();
  });

  it('renders booleans as Sí/No and catalog ids as labels', () => {
    renderReview();
    expect(screen.getByText('Sí')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Kiro')).toBeInTheDocument();
    expect(screen.queryByText('typescript')).not.toBeInTheDocument();
  });

  it('groups answers under their workflow section', () => {
    renderReview();
    expect(screen.getByText('Identidad')).toBeInTheDocument();
    expect(screen.getByText('Stack')).toBeInTheDocument();
    expect(screen.getByText('Salida')).toBeInTheDocument();
  });

  it('lets the user jump back to a single answer', () => {
    const { onEditAnswer } = renderReview();
    fireEvent.click(screen.getByRole('button', { name: /Editar: ¿Cómo se llamará el agente\?/i }));
    expect(onEditAnswer).toHaveBeenCalledWith('agent_name');
  });

  it('hides recommendation detail until it is expanded', () => {
    renderReview();
    expect(screen.queryByText('capabilities=edit-code')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Evidencia, beneficios y trade-offs/i }));
    expect(screen.getByText('capabilities=edit-code')).toBeInTheDocument();
    expect(screen.getByText('Reduce el radio de impacto de un error')).toBeInTheDocument();
    expect(screen.getByText('Requiere aprobación humana explícita')).toBeInTheDocument();
    expect(screen.getByText('Modo sólo lectura')).toBeInTheDocument();
  });

  it('renders backend warnings', () => {
    renderReview({ warnings: ['Producción sin aprobación humana.'] });
    expect(screen.getByText('Producción sin aprobación humana.')).toBeInTheDocument();
  });

  it('blocks generation while the backend reports rejected answers', () => {
    const { onGenerate } = renderReview({
      issues: [{ path: 'answers.technologies', message: 'La lista contiene una tecnología fuera de la categoría.' }],
    });
    const button = screen.getByRole('button', { name: /Generar configuración/i });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onGenerate).not.toHaveBeenCalled();
    expect(screen.getByText(/fuera de la categoría/i)).toBeInTheDocument();
  });

  it('generates when there is nothing blocking', () => {
    const { onGenerate } = renderReview();
    fireEvent.click(screen.getByRole('button', { name: /Generar configuración/i }));
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it('marks an unanswered optional question instead of omitting it', () => {
    renderReview({
      answers: { agent_name: 'reviewer', technologies: [], pr_review_enabled: false, agent_targets: ['kiro'] },
    });
    expect(screen.getByText('Sin responder')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });
});
