import { beforeEach, describe, expect, it } from 'vitest';
import { clearDraft, draftHasProgress, loadDraft, saveDraft } from './session';

const VERSION = '1.0.0';

function draft(overrides: Partial<Parameters<typeof saveDraft>[0]> = {}) {
  return {
    workflowVersion: VERSION,
    mode: 'auto-largo' as const,
    answers: { agent_name: 'reviewer', technologies: ['typescript'], hooks_enabled: true },
    visited: ['agent_name'],
    currentQuestionId: 'purpose',
    reviewing: false,
    ...overrides,
  };
}

describe('creator draft persistence', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('round-trips a draft', () => {
    saveDraft(draft());
    expect(loadDraft(VERSION)).toEqual(draft());
  });

  it('returns null when nothing is stored', () => {
    expect(loadDraft(VERSION)).toBeNull();
  });

  it('discards a draft from a different workflow version', () => {
    // A backend workflow upgrade must not replay answers against questions
    // that may no longer exist.
    saveDraft(draft());
    expect(loadDraft('2.0.0')).toBeNull();
  });

  it('survives corrupt storage instead of throwing', () => {
    window.sessionStorage.setItem('huascar.creator.draft.v1', '{not json');
    expect(loadDraft(VERSION)).toBeNull();
  });

  it('drops answer values that are not valid creator types', () => {
    window.sessionStorage.setItem(
      'huascar.creator.draft.v1',
      JSON.stringify({
        workflowVersion: VERSION,
        mode: 'auto-corto',
        answers: { agent_name: 'ok', bad_number: 12, bad_object: { nested: true }, bad_array: [1, 2] },
        visited: ['agent_name', 7],
        currentQuestionId: 'purpose',
        reviewing: false,
      }),
    );
    const restored = loadDraft(VERSION);
    expect(restored?.answers).toEqual({ agent_name: 'ok' });
    expect(restored?.visited).toEqual(['agent_name']);
  });

  it('rejects an unknown mode', () => {
    window.sessionStorage.setItem(
      'huascar.creator.draft.v1',
      JSON.stringify({ workflowVersion: VERSION, mode: 'telepathy', answers: {} }),
    );
    expect(loadDraft(VERSION)?.mode).toBeNull();
  });

  it('clears the stored draft', () => {
    saveDraft(draft());
    clearDraft();
    expect(loadDraft(VERSION)).toBeNull();
  });

  it('reports whether a draft is worth restoring', () => {
    expect(draftHasProgress(null)).toBe(false);
    expect(draftHasProgress(draft({ mode: null }))).toBe(false);
    expect(draftHasProgress(draft({ answers: {} }))).toBe(false);
    expect(draftHasProgress(draft())).toBe(true);
  });
});
