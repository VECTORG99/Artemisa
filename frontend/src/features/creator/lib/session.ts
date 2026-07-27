import type { CreatorAnswers } from '@artemisa/types';

/**
 * Draft persistence for the Creator.
 *
 * The backend is stateless by design (no anonymous sessions, see README
 * "Por qué el Creator es stateless"), so a reload would otherwise discard
 * every answer. `sessionStorage` keeps the draft for the tab's lifetime only:
 * it never leaves the browser, expires when the tab closes, and stores no
 * identity — which is what the roadmap item "Conservar answers en
 * sessionStorage" asks for without pretending an account exists.
 *
 * The record is namespaced by workflow version: after a backend workflow
 * upgrade an old draft is dropped instead of being replayed against questions
 * that may no longer exist.
 */

const STORAGE_KEY = 'artemisa.creator.draft.v1';

export type PersistedMode = 'auto-corto' | 'auto-largo' | 'presets' | 'avanzado';

export interface CreatorDraft {
  workflowVersion: string;
  mode: PersistedMode | null;
  answers: CreatorAnswers;
  visited: string[];
  currentQuestionId: string | null;
  /** True once the user reached the review screen. */
  reviewing: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Narrows unknown JSON into a draft, discarding anything malformed. */
function parseDraft(raw: unknown, workflowVersion: string): CreatorDraft | null {
  if (!isRecord(raw)) return null;
  if (raw.workflowVersion !== workflowVersion) return null;

  const answers: CreatorAnswers = {};
  if (isRecord(raw.answers)) {
    for (const [key, value] of Object.entries(raw.answers)) {
      if (typeof value === 'string' || typeof value === 'boolean') answers[key] = value;
      else if (Array.isArray(value) && value.every((item) => typeof item === 'string'))
        answers[key] = value as string[];
    }
  }

  const modes: PersistedMode[] = ['auto-corto', 'auto-largo', 'presets', 'avanzado'];
  const mode = modes.find((candidate) => candidate === raw.mode) ?? null;

  return {
    workflowVersion,
    mode,
    answers,
    visited: Array.isArray(raw.visited) ? raw.visited.filter((id): id is string => typeof id === 'string') : [],
    currentQuestionId: typeof raw.currentQuestionId === 'string' ? raw.currentQuestionId : null,
    reviewing: raw.reviewing === true,
  };
}

export function loadDraft(workflowVersion: string): CreatorDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parseDraft(JSON.parse(raw), workflowVersion);
  } catch {
    // Corrupt or blocked storage must never break the Creator.
    return null;
  }
}

export function saveDraft(draft: CreatorDraft): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Private-mode quota errors are non-fatal: the draft is a convenience.
  }
}

export function clearDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** True when the draft holds something worth restoring. */
export function draftHasProgress(draft: CreatorDraft | null): boolean {
  if (!draft) return false;
  return draft.mode !== null && Object.keys(draft.answers).length > 0;
}
