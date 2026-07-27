import type { CreatorAnswers, DecisionEvaluation, DecisionQuestion } from '@artemisa/types';
import { SHORT_FLOW_QUESTION_IDS } from '../presets/short-flow';

/**
 * Navigation for the guided modes (Auto-corto / Auto-largo).
 *
 * The backend is stateless and returns `nextQuestion` as *the first unanswered
 * required question*. Following that field alone has two consequences the UI
 * has to solve here:
 *
 * 1. The four optional questions (`agent_persona`, `testing_tools`,
 *    `container_platforms`, `infrastructure`) are never returned, so
 *    "Auto-largo: flujo completo" silently skipped them.
 * 2. Going back cannot be expressed as "ask the backend again", because with
 *    the previous answers still present the backend returns the same question.
 *
 * So the client walks `evaluation.visibleQuestions` (already in declaration
 * order, already branch-resolved by the backend) and keeps its own visited
 * trail. Newly revealed questions are picked up automatically: because the
 * next step is always *the first unvisited visible question*, answering
 * `environment=production` correctly routes back to `deployment_target`
 * even though it is declared before questions already visited.
 */

export type GuidedMode = 'auto-corto' | 'auto-largo';

/** Question ids this mode asks, in the backend's declaration order. */
export function flowQuestionIds(visibleQuestions: DecisionQuestion[], mode: GuidedMode): string[] {
  const ids = visibleQuestions.map((question) => question.id);
  if (mode === 'auto-largo') return ids;
  return ids.filter((id) => SHORT_FLOW_QUESTION_IDS.includes(id));
}

/**
 * Drops ids that are no longer visible. Changing an earlier answer can hide a
 * branch the user already walked; without this the trail would keep counting
 * questions that no longer exist and `back` could land on a hidden question.
 */
export function pruneVisited(visited: string[], flowIds: string[]): string[] {
  const allowed = new Set(flowIds);
  return visited.filter((id) => allowed.has(id));
}

/**
 * The step after `currentId`: the first question in declaration order that
 * has not been visited yet. `null` means the mode has nothing left to ask.
 */
export function nextFlowQuestionId(flowIds: string[], visited: string[], currentId: string | null): string | null {
  const seen = new Set(visited);
  if (currentId) seen.add(currentId);
  return flowIds.find((id) => !seen.has(id)) ?? null;
}

/** 0-100 completion of the *current mode's* question list, not of the whole tree. */
export function flowProgress(flowIds: string[], visited: string[], currentId: string | null): number {
  if (flowIds.length === 0) return 0;
  const seen = new Set(pruneVisited(visited, flowIds));
  if (currentId && flowIds.includes(currentId)) seen.delete(currentId);
  return Math.round((seen.size / flowIds.length) * 100);
}

/** 1-based position of the current question within the mode's list. */
export function flowPosition(flowIds: string[], currentId: string | null): { step: number; total: number } {
  const total = flowIds.length;
  if (!currentId) return { step: total, total };
  const index = flowIds.indexOf(currentId);
  return { step: index === -1 ? total : index + 1, total };
}

/**
 * A question counts as answerable-and-continuable when it holds a value, or
 * when it is optional (the user may move on without choosing anything). The
 * backend applies the same rule: only `required` questions block
 * `progress.complete`.
 */
export function canAdvance(question: DecisionQuestion, value: unknown): boolean {
  if (!question.required) return true;
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === 'string' && value.trim().length > 0;
}

/** Whether a value counts as answered (mirrors the backend's `isAnswered`). */
export function isAnswered(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Where the guided flow should go after an evaluation.
 *
 * `question`  — ask this next; `null` when the mode's list is finished.
 * `exhausted` — the mode's own list is finished.
 * `blocking`  — the backend still reports a missing required answer.
 *
 * `exhausted` and `blocking` are reported separately on purpose. Auto-largo can
 * ask the blocking question directly, but Auto-corto must first merge its safe
 * defaults: jumping straight to `evaluation.nextQuestion` would make it keep
 * asking the rest of the tree one question at a time, which is exactly what the
 * curated subset exists to avoid.
 */
export function resolveNextStep(
  evaluation: DecisionEvaluation,
  mode: GuidedMode,
  visited: string[],
  currentId: string | null,
): {
  question: DecisionQuestion | null;
  visited: string[];
  exhausted: boolean;
  blocking: DecisionQuestion | null;
} {
  const flowIds = flowQuestionIds(evaluation.visibleQuestions, mode);
  const trail = pruneVisited(currentId ? [...visited, currentId] : visited, flowIds);
  const blocking = evaluation.nextQuestion;

  const nextId = nextFlowQuestionId(flowIds, trail, null);
  if (nextId) {
    const question = evaluation.visibleQuestions.find((item) => item.id === nextId) ?? null;
    if (question) return { question, visited: trail, exhausted: false, blocking };
  }

  return { question: null, visited: trail, exhausted: true, blocking };
}

/**
 * One step back: the last visited question becomes current again. The answer
 * is intentionally *kept* so the user sees what they chose and can adjust it,
 * instead of finding a blank question.
 */
export function resolvePreviousStep(
  visited: string[],
  flowIds: string[],
): { questionId: string | null; visited: string[] } {
  const trail = pruneVisited(visited, flowIds);
  if (trail.length === 0) return { questionId: null, visited: trail };
  const questionId = trail[trail.length - 1];
  return { questionId, visited: trail.slice(0, -1) };
}

/** Default editing value for a question with no answer yet. */
export function defaultAnswer(question: DecisionQuestion): CreatorAnswers[string] | undefined {
  if (question.type === 'multiselect' || question.type === 'catalog-multiselect' || question.type === 'custom')
    return [];
  if (question.type === 'boolean') return undefined; // tri-state: nothing preselected
  return '';
}
