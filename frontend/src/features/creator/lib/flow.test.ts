import { describe, expect, it } from 'vitest';
import type { DecisionEvaluation, DecisionQuestion } from '@huascar/types';
import {
  canAdvance,
  defaultAnswer,
  flowPosition,
  flowProgress,
  flowQuestionIds,
  nextFlowQuestionId,
  pruneVisited,
  resolveNextStep,
  resolvePreviousStep,
} from './flow';
import { SHORT_FLOW_QUESTION_IDS } from '../presets/short-flow';

function question(id: string, overrides: Partial<DecisionQuestion> = {}): DecisionQuestion {
  return {
    id,
    section: 'Sección',
    prompt: `Pregunta ${id}`,
    description: '',
    type: 'text',
    required: true,
    ...overrides,
  };
}

function evaluation(visible: DecisionQuestion[], overrides: Partial<DecisionEvaluation> = {}): DecisionEvaluation {
  return {
    workflowVersion: '1.0.0',
    answers: {},
    visibleQuestions: visible,
    answeredQuestionIds: [],
    nextQuestion: null,
    progress: { answered: 0, total: visible.length, percent: 0, complete: false },
    recommendations: [],
    warnings: [],
    issues: [],
    ...overrides,
  };
}

describe('flowQuestionIds', () => {
  it('walks every visible question in auto-largo, including optional ones', () => {
    const visible = [question('agent_name'), question('agent_persona', { required: false }), question('purpose')];
    expect(flowQuestionIds(visible, 'auto-largo')).toEqual(['agent_name', 'agent_persona', 'purpose']);
  });

  it('restricts auto-corto to the curated subset', () => {
    const visible = [
      question('agent_name'),
      question('agent_persona', { required: false }),
      question('purpose'),
      question('architecture'),
    ];
    const ids = flowQuestionIds(visible, 'auto-corto');
    expect(ids).toEqual(['agent_name', 'purpose']);
    for (const id of ids) expect(SHORT_FLOW_QUESTION_IDS).toContain(id);
  });
});

describe('pruneVisited', () => {
  it('drops questions that are no longer visible after a branch change', () => {
    expect(pruneVisited(['environment', 'deployment_target', 'ci_cd'], ['environment', 'ci_cd'])).toEqual([
      'environment',
      'ci_cd',
    ]);
  });
});

describe('nextFlowQuestionId', () => {
  it('returns the first unvisited question in declaration order', () => {
    expect(nextFlowQuestionId(['a', 'b', 'c'], ['a'], 'b')).toBe('c');
  });

  it('routes back to a newly revealed question declared earlier', () => {
    // Answering `environment` reveals `deployment_target`, which the backend
    // declares before `ci_cd`. The flow must fill it instead of skipping it.
    expect(nextFlowQuestionId(['environment', 'deployment_target', 'ci_cd'], ['environment'], null)).toBe(
      'deployment_target',
    );
  });

  it('returns null when nothing is left', () => {
    expect(nextFlowQuestionId(['a', 'b'], ['a'], 'b')).toBeNull();
  });
});

describe('flowProgress', () => {
  it('reports progress against the mode list, not the whole tree', () => {
    // Auto-corto asks 8 of 28 required questions; progress must not be
    // computed from the backend's tree-wide percentage.
    expect(flowProgress(['a', 'b', 'c', 'd'], ['a', 'b'], 'c')).toBe(50);
  });

  it('does not count the question currently on screen', () => {
    expect(flowProgress(['a', 'b'], ['a'], 'b')).toBe(50);
  });

  it('is 0 with an empty list', () => {
    expect(flowProgress([], [], null)).toBe(0);
  });
});

describe('flowPosition', () => {
  it('reports a 1-based step', () => {
    expect(flowPosition(['a', 'b', 'c'], 'b')).toEqual({ step: 2, total: 3 });
  });

  it('reports the last step when there is no current question', () => {
    expect(flowPosition(['a', 'b'], null)).toEqual({ step: 2, total: 2 });
  });
});

describe('canAdvance', () => {
  it('blocks an empty required text answer', () => {
    expect(canAdvance(question('objective', { type: 'textarea' }), '   ')).toBe(false);
  });

  it('allows an empty optional answer', () => {
    // The four optional questions (agent_persona, testing_tools,
    // container_platforms, infrastructure) must not trap the user.
    expect(canAdvance(question('agent_persona', { required: false, type: 'textarea' }), '')).toBe(true);
    expect(canAdvance(question('testing_tools', { required: false, type: 'catalog-multiselect' }), [])).toBe(true);
  });

  it('allows an explicit false on a boolean', () => {
    expect(canAdvance(question('hooks_enabled', { type: 'boolean' }), false)).toBe(true);
  });

  it('blocks a boolean that has not been answered', () => {
    expect(canAdvance(question('hooks_enabled', { type: 'boolean' }), undefined)).toBe(false);
  });

  it('requires at least one selection on a required multiselect', () => {
    expect(canAdvance(question('capabilities', { type: 'multiselect' }), [])).toBe(false);
    expect(canAdvance(question('capabilities', { type: 'multiselect' }), ['read-repository'])).toBe(true);
  });
});

describe('defaultAnswer', () => {
  it('leaves booleans unanswered so "No" is not preselected', () => {
    expect(defaultAnswer(question('hooks_enabled', { type: 'boolean' }))).toBeUndefined();
  });

  it('uses an empty array for multi-value questions', () => {
    expect(defaultAnswer(question('technologies', { type: 'catalog-multiselect' }))).toEqual([]);
    expect(defaultAnswer(question('skills_selection', { type: 'custom' }))).toEqual([]);
  });

  it('uses an empty string for text', () => {
    expect(defaultAnswer(question('agent_name'))).toBe('');
  });
});

describe('resolveNextStep', () => {
  it('advances to the next unvisited question and records the trail', () => {
    const visible = [question('a'), question('b'), question('c')];
    const step = resolveNextStep(evaluation(visible), 'auto-largo', ['a'], 'b');
    expect(step.question?.id).toBe('c');
    expect(step.visited).toEqual(['a', 'b']);
    expect(step.exhausted).toBe(false);
  });

  it('reports exhaustion when every question has been visited', () => {
    const visible = [question('a'), question('b')];
    const step = resolveNextStep(evaluation(visible), 'auto-largo', ['a'], 'b');
    expect(step.question).toBeNull();
    expect(step.exhausted).toBe(true);
    expect(step.blocking).toBeNull();
  });

  it('reports the still-blocking question separately from exhaustion', () => {
    // Auto-corto exhausts its 8 curated questions while the backend still
    // requires questions the subset does not ask. The caller must merge the
    // short-flow defaults first, so this is reported as `blocking`, never as
    // the next question to display.
    const visible = [question('agent_name'), question('architecture')];
    const step = resolveNextStep(
      evaluation(visible, { nextQuestion: question('architecture') }),
      'auto-corto',
      [],
      'agent_name',
    );
    expect(step.exhausted).toBe(true);
    expect(step.question).toBeNull();
    expect(step.blocking?.id).toBe('architecture');
  });

  it('forgets a trail entry whose branch disappeared', () => {
    const visible = [question('environment'), question('ci_cd')];
    const step = resolveNextStep(evaluation(visible), 'auto-largo', ['environment', 'deployment_target'], 'ci_cd');
    expect(step.visited).toEqual(['environment', 'ci_cd']);
  });
});

describe('resolvePreviousStep', () => {
  it('returns to the last visited question and shortens the trail', () => {
    // Regression: the old implementation popped the trail but deleted the
    // *current* question's answer, so /evaluate returned the same question and
    // the back button appeared to do nothing.
    const step = resolvePreviousStep(['a', 'b', 'c'], ['a', 'b', 'c', 'd']);
    expect(step.questionId).toBe('c');
    expect(step.visited).toEqual(['a', 'b']);
  });

  it('has nothing to go back to on the first question', () => {
    expect(resolvePreviousStep([], ['a'])).toEqual({ questionId: null, visited: [] });
  });

  it('skips a previous question that is no longer visible', () => {
    const step = resolvePreviousStep(['environment', 'deployment_target'], ['environment', 'ci_cd']);
    expect(step.questionId).toBe('environment');
    expect(step.visited).toEqual([]);
  });
});
