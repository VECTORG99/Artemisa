import { describe, expect, it } from 'vitest';

import { localizeQuestion, localizeSection, localizeWorkflow, TRANSLATED_QUESTION_IDS } from './localize-workflow';

// Issue #737: the decision tree contract is Spanish-only, so with the UI in
// English the Creator rendered Spanish prompts, descriptions and sections.

const question = {
  id: 'agent_name',
  section: 'Identidad',
  prompt: '¿Cómo se llamará el agente?',
  description: 'Un nombre corto permite identificar archivos, skills y documentación.',
  type: 'text' as const,
  required: true,
  placeholder: 'Ej: reviewer-plataforma',
};

describe('localizeQuestion', () => {
  it('returns the backend text untouched for Spanish', () => {
    expect(localizeQuestion(question, 'es')).toBe(question);
  });

  it('translates prompt, description, placeholder and section for English', () => {
    const localized = localizeQuestion(question, 'en');
    expect(localized.prompt).toBe('What will the agent be called?');
    expect(localized.description).toBe('A short name keeps files, skills and documentation identifiable.');
    expect(localized.placeholder).toBe('e.g. platform-reviewer');
    expect(localized.section).toBe('Identity');
  });

  it('keeps everything else of the question', () => {
    const localized = localizeQuestion(question, 'en');
    expect(localized.id).toBe('agent_name');
    expect(localized.type).toBe('text');
    expect(localized.required).toBe(true);
  });

  it('falls back to the backend text for an unknown question id', () => {
    const unknown = { ...question, id: 'brand_new_question', section: 'Sección nueva' };
    const localized = localizeQuestion(unknown, 'en');
    expect(localized.prompt).toBe(unknown.prompt);
    expect(localized.description).toBe(unknown.description);
    expect(localized.section).toBe('Sección nueva');
  });

  it('still translates the section of an untranslated question', () => {
    const unknown = { ...question, id: 'brand_new_question' };
    expect(localizeQuestion(unknown, 'en').section).toBe('Identity');
  });
});

describe('localizeSection', () => {
  it('translates the known sections', () => {
    expect(localizeSection('Identidad', 'en')).toBe('Identity');
    expect(localizeSection('Entorno de desarrollo', 'en')).toBe('Development environment');
    expect(localizeSection('Salida', 'en')).toBe('Output');
  });

  it('returns the original name in Spanish or when unknown', () => {
    expect(localizeSection('Identidad', 'es')).toBe('Identidad');
    expect(localizeSection('Sección nueva', 'en')).toBe('Sección nueva');
  });
});

describe('localizeWorkflow', () => {
  it('localizes every question and keeps the version', () => {
    const workflow = { version: '1.2.3', questions: [question] };
    const localized = localizeWorkflow(workflow, 'en');
    expect(localized?.version).toBe('1.2.3');
    expect(localized?.questions[0]?.prompt).toBe('What will the agent be called?');
  });

  it('passes through null and Spanish', () => {
    expect(localizeWorkflow(null, 'en')).toBeNull();
    const workflow = { version: '1', questions: [question] };
    expect(localizeWorkflow(workflow, 'es')).toBe(workflow);
  });
});

describe('translation table', () => {
  it('covers the 32 questions of the tree', () => {
    expect(TRANSLATED_QUESTION_IDS).toHaveLength(32);
  });

  it('has no Spanish leftovers in the English prompts', () => {
    for (const id of TRANSLATED_QUESTION_IDS) {
      const localized = localizeQuestion({ ...question, id }, 'en');
      expect(localized.prompt, id).not.toMatch(/[¿¡]|ñ|á|é|í|ó|ú/);
    }
  });
});
