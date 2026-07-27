import { describe, expect, it } from 'vitest';
import type { Catalog, CreatorAnswers, DecisionQuestion, Workflow } from '@artemisa/types';

import {
  FALLBACK_SECTION,
  buildLabelLookup,
  emptyLabelLookup,
  formatAnswer,
  formatAnswerValue,
  groupAnswersBySection,
} from './answer-labels';

// Small inline fixtures mirroring the shape of src/creator/decisionTree.ts and
// the /catalog response. The backend is intentionally not imported: the module
// under test must work off the wire contract alone.
const question = (partial: Partial<DecisionQuestion> & Pick<DecisionQuestion, 'id'>): DecisionQuestion => ({
  section: 'Identidad',
  prompt: 'Pregunta',
  description: '',
  type: 'text',
  required: true,
  ...partial,
});

const agentName = question({
  id: 'agent_name',
  section: 'Identidad',
  prompt: '¿Cómo se llamará el agente?',
  type: 'text',
});

const purpose = question({
  id: 'purpose',
  section: 'Objetivo',
  prompt: '¿Qué problema principal resolverá?',
  type: 'select',
  options: [
    { id: 'pr-review', label: 'Revisión de pull requests', description: '' },
    { id: 'coding', label: 'Desarrollo y mantenimiento', description: '' },
  ],
});

const objective = question({
  id: 'objective',
  section: 'Objetivo',
  prompt: 'Describe el resultado que esperas del agente',
  type: 'textarea',
});

const technologies = question({
  id: 'technologies',
  section: 'Stack',
  prompt: 'Selecciona las tecnologías del proyecto',
  type: 'catalog-multiselect',
  catalogCategories: ['language'],
});

const prReviewEnabled = question({
  id: 'pr_review_enabled',
  section: 'Pull requests',
  prompt: '¿Debe incluir una configuración especializada de PR review?',
  type: 'boolean',
});

const agentTargets = question({
  id: 'agent_targets',
  section: 'Salida',
  prompt: '¿Para qué plataformas se generará la configuración?',
  type: 'catalog-multiselect',
  catalogCategories: ['agent-platform'],
});

const skillsSelection = question({
  id: 'skills_selection',
  section: 'Salida',
  prompt: 'Selecciona las skills específicas',
  type: 'custom',
  catalogCategories: ['skill'],
});

const workflow: Workflow = {
  version: '1.0.0',
  questions: [agentName, purpose, objective, technologies, prReviewEnabled, agentTargets, skillsSelection],
};

const catalog: Catalog = {
  version: '1.0.0',
  categories: [],
  items: [
    {
      id: 'typescript',
      category: 'language',
      label: 'TypeScript',
      description: '',
      tags: [],
      environments: ['both'],
      recommendedFor: [],
    },
    {
      id: 'artemisa',
      category: 'agent-platform',
      label: 'Artemisa',
      description: '',
      tags: [],
      environments: ['both'],
      recommendedFor: [],
    },
    {
      id: 'kiro',
      category: 'agent-platform',
      label: 'Kiro',
      description: '',
      tags: [],
      environments: ['both'],
      recommendedFor: [],
    },
  ],
};

const lookup = buildLabelLookup({
  catalog,
  skills: [{ id: 'secret-scan', name: 'Escaneo de secretos' }],
  mcps: [{ id: 'github-mcp', name: 'GitHub MCP' }],
});

describe('formatAnswerValue', () => {
  it('renders booleans as Sí / No', () => {
    expect(formatAnswerValue(prReviewEnabled, true, lookup)).toEqual(['Sí']);
    expect(formatAnswerValue(prReviewEnabled, false, lookup)).toEqual(['No']);
  });

  it('resolves select and multiselect values through question options', () => {
    expect(formatAnswerValue(purpose, 'pr-review', lookup)).toEqual(['Revisión de pull requests']);

    const capabilities = question({
      id: 'capabilities',
      section: 'Permisos',
      prompt: '¿Qué capacidades necesita el agente?',
      type: 'multiselect',
      options: [
        { id: 'read-repository', label: 'Leer repositorio', description: '' },
        { id: 'run-tests', label: 'Ejecutar pruebas', description: '' },
      ],
    });
    expect(formatAnswerValue(capabilities, ['read-repository', 'run-tests'], lookup)).toEqual([
      'Leer repositorio',
      'Ejecutar pruebas',
    ]);
  });

  it('resolves catalog values through the catalog labels', () => {
    expect(formatAnswerValue(technologies, ['typescript'], lookup)).toEqual(['TypeScript']);
    expect(formatAnswerValue(agentTargets, ['artemisa', 'kiro'], lookup)).toEqual(['Artemisa', 'Kiro']);
  });

  it('resolves skill and mcp ids through their catalog names', () => {
    expect(formatAnswerValue(skillsSelection, ['secret-scan', 'github-mcp'], lookup)).toEqual([
      'Escaneo de secretos',
      'GitHub MCP',
    ]);
  });

  it('formats custom: entries as Personalizado with a humanized slug', () => {
    expect(formatAnswerValue(technologies, ['custom:my-tool'], lookup)).toEqual(['Personalizado: My tool']);
    expect(formatAnswerValue(technologies, 'custom:internal-graph-db', lookup)).toEqual([
      'Personalizado: Internal graph db',
    ]);
  });

  it('falls back to the raw id when nothing resolves it', () => {
    expect(formatAnswerValue(technologies, ['unknown-thing'], lookup)).toEqual(['unknown-thing']);
    expect(formatAnswerValue(undefined, ['typescript'], emptyLabelLookup)).toEqual(['typescript']);
  });

  it('passes free text through, trimmed', () => {
    expect(formatAnswerValue(agentName, '  reviewer-plataforma  ', lookup)).toEqual(['reviewer-plataforma']);
    expect(formatAnswerValue(objective, ' Revisar PRs sin hacer merge. ', lookup)).toEqual([
      'Revisar PRs sin hacer merge.',
    ]);
  });

  it('returns no values for empty answers', () => {
    expect(formatAnswerValue(agentName, '   ', lookup)).toEqual([]);
    expect(formatAnswerValue(technologies, [], lookup)).toEqual([]);
  });
});

describe('formatAnswer', () => {
  it('detects empty values without flagging booleans', () => {
    expect(formatAnswer('agent_name', '', agentName, lookup).empty).toBe(true);
    expect(formatAnswer('technologies', [], technologies, lookup).empty).toBe(true);
    expect(formatAnswer('agent_name', 'reviewer', agentName, lookup).empty).toBe(false);
    expect(formatAnswer('pr_review_enabled', false, prReviewEnabled, lookup).empty).toBe(false);
  });

  it('flags answers carrying a custom entry', () => {
    expect(formatAnswer('technologies', ['typescript', 'custom:my-tool'], technologies, lookup).custom).toBe(true);
    expect(formatAnswer('technologies', ['typescript'], technologies, lookup).custom).toBe(false);
    expect(formatAnswer('pr_review_enabled', true, prReviewEnabled, lookup).custom).toBe(false);
  });

  it('keeps the raw value for edit affordances', () => {
    const formatted = formatAnswer('agent_targets', ['artemisa', 'kiro'], agentTargets, lookup);
    expect(formatted.raw).toEqual(['artemisa', 'kiro']);
    expect(formatted.label).toBe('¿Para qué plataformas se generará la configuración?');
    expect(formatted.section).toBe('Salida');
  });
});

describe('groupAnswersBySection', () => {
  const answers: CreatorAnswers = {
    // Deliberately out of workflow order to prove ordering is not insertion based.
    pr_review_enabled: true,
    agent_targets: ['artemisa', 'kiro'],
    purpose: 'pr-review',
    agent_name: 'reviewer-plataforma',
    technologies: ['typescript', 'custom:my-tool'],
  };

  it('groups by section following workflow declaration order', () => {
    const sections = groupAnswersBySection(answers, workflow, lookup);
    expect(sections.map((section) => section.section)).toEqual([
      'Identidad',
      'Objetivo',
      'Stack',
      'Pull requests',
      'Salida',
    ]);
    expect(sections[0].answers.map((answer) => answer.questionId)).toEqual(['agent_name']);
    expect(sections[1].answers.map((answer) => answer.questionId)).toEqual(['purpose']);
  });

  it('renders human labels instead of internal ids', () => {
    const sections = groupAnswersBySection(answers, workflow, lookup);
    const flat = sections.flatMap((section) => section.answers);

    expect(flat.find((answer) => answer.questionId === 'pr_review_enabled')?.values).toEqual(['Sí']);
    expect(flat.find((answer) => answer.questionId === 'agent_targets')?.values).toEqual(['Artemisa', 'Kiro']);
    expect(flat.find((answer) => answer.questionId === 'technologies')?.values).toEqual([
      'TypeScript',
      'Personalizado: My tool',
    ]);
  });

  it('collects answers without a matching question under Otros, last', () => {
    const sections = groupAnswersBySection({ ...answers, legacy_flag: 'yes' }, workflow, lookup);

    expect(sections.at(-1)?.section).toBe(FALLBACK_SECTION);
    const other = sections.at(-1)?.answers ?? [];
    expect(other).toHaveLength(1);
    expect(other[0].questionId).toBe('legacy_flag');
    expect(other[0].label).toBe('legacy_flag');
    expect(other[0].values).toEqual(['yes']);
  });

  it('keeps every answer when the workflow is missing', () => {
    const sections = groupAnswersBySection(answers, null, lookup);

    expect(sections).toHaveLength(1);
    expect(sections[0].section).toBe(FALLBACK_SECTION);
    expect(sections[0].answers.map((answer) => answer.questionId)).toEqual([
      'pr_review_enabled',
      'agent_targets',
      'purpose',
      'agent_name',
      'technologies',
    ]);
    expect(sections[0].answers[0].values).toEqual(['Sí']);
  });

  it('never drops empty answers, it flags them', () => {
    const sections = groupAnswersBySection({ agent_name: '', technologies: [] }, workflow, lookup);
    const flat = sections.flatMap((section) => section.answers);

    expect(flat.map((answer) => answer.questionId)).toEqual(['agent_name', 'technologies']);
    expect(flat.every((answer) => answer.empty)).toBe(true);
    expect(flat.every((answer) => answer.values.length === 0)).toBe(true);
  });
});

describe('buildLabelLookup', () => {
  it('tolerates a null catalog', () => {
    const bare = buildLabelLookup({ catalog: null });
    expect(bare('typescript')).toBeUndefined();
    expect(formatAnswerValue(technologies, ['typescript'], bare)).toEqual(['typescript']);
  });

  it('resolves catalog, skill and mcp ids', () => {
    expect(lookup('typescript')).toBe('TypeScript');
    expect(lookup('secret-scan')).toBe('Escaneo de secretos');
    expect(lookup('github-mcp')).toBe('GitHub MCP');
    expect(lookup('nope')).toBeUndefined();
  });
});
