/**
 * Pure formatting layer that turns raw Creator answers into human-readable
 * label/value pairs (issue #435).
 *
 * The Creator keeps answers as backend ids (`pr_review_enabled: true`,
 * `agent_targets: ['artemisa', 'kiro']`). Those ids are the wire contract, not
 * something a user should read. This module resolves each id back to the label
 * the backend already ships — `question.options[].label` for select-style
 * questions, catalog `item.label` for catalog-backed ones, skill/MCP `name`
 * for the custom pickers — so the review screen and any other summary render
 * the same wording the user clicked.
 *
 * Deliberately free of React, fetch and `@/lib/api` so it can be unit tested
 * and reused from server components.
 */
import type { Catalog, CreatorAnswers, CreatorAnswerValue, DecisionQuestion, Workflow } from '@artemisa/types';

/** Section used for answers that have no matching question in the workflow. */
export const FALLBACK_SECTION = 'Otros';

interface AnswerLabels {
  yesLabel: string;
  noLabel: string;
  customPrefix: string;
  fallbackSection: string;
}

const DEFAULT_LABELS: AnswerLabels = {
  yesLabel: 'Sí',
  noLabel: 'No',
  customPrefix: 'Personalizado: ',
  fallbackSection: FALLBACK_SECTION,
};

/** Prefix the backend uses for user-provided catalog entries. */
const CUSTOM_PREFIX = 'custom:';

export interface FormattedAnswer {
  questionId: string;
  /** `question.section`, e.g. 'Identidad'. `FALLBACK_SECTION` when unmapped. */
  section: string;
  /** `question.prompt`, or the raw question id when unmapped. */
  label: string;
  /** Display strings, already human readable. One entry per selected value. */
  values: string[];
  /** Raw value, for edit affordances. */
  raw: CreatorAnswerValue;
  /** True when the value is empty / unanswered. */
  empty: boolean;
  /** True when the answer contains at least one `custom:` entry. */
  custom: boolean;
}

export interface AnswerSection {
  section: string;
  answers: FormattedAnswer[];
}

/**
 * Resolves an id to its human label.
 * Returns `undefined` when the id is unknown so callers can fall back.
 */
export type LabelLookup = (id: string) => string | undefined;

/**
 * Builds the id -> label resolver from the catalog plus optional skill/mcp
 * catalogs. Catalog items win over skills/MCPs only when ids collide, which
 * the backend avoids; later sources fill the gaps.
 */
export function buildLabelLookup(args: {
  catalog: Catalog | null;
  skills?: { id: string; name: string }[];
  mcps?: { id: string; name: string }[];
}): LabelLookup {
  const labels = new Map<string, string>();

  for (const item of args.catalog?.items ?? []) {
    labels.set(item.id, item.label);
  }
  for (const skill of args.skills ?? []) {
    if (!labels.has(skill.id)) labels.set(skill.id, skill.name);
  }
  for (const mcp of args.mcps ?? []) {
    if (!labels.has(mcp.id)) labels.set(mcp.id, mcp.name);
  }

  return (id: string) => labels.get(id);
}

/** Lookup that resolves nothing; useful before the catalog has loaded. */
export const emptyLabelLookup: LabelLookup = () => undefined;

/** `my-tool` -> `My tool`: de-hyphenate and capitalise the first word. */
function humanizeSlug(slug: string): string {
  const words = slug.replace(/[-_]+/g, ' ').trim();
  if (words.length === 0) return slug;
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** True when the raw value carries at least one `custom:` entry. */
function hasCustomEntry(value: CreatorAnswerValue): boolean {
  if (typeof value === 'string') return value.startsWith(CUSTOM_PREFIX);
  if (Array.isArray(value)) return value.some((entry) => entry.startsWith(CUSTOM_PREFIX));
  return false;
}

/** True for empty strings (after trim) and empty arrays. Booleans are never empty. */
function isEmptyValue(value: CreatorAnswerValue): boolean {
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** Resolve one id through the question options, then the catalog lookup. */
function resolveId(
  question: DecisionQuestion | undefined,
  id: string,
  lookup: LabelLookup,
  customPrefix: string,
): string {
  if (id.startsWith(CUSTOM_PREFIX)) {
    return `${customPrefix}${humanizeSlug(id.slice(CUSTOM_PREFIX.length))}`;
  }

  const option = question?.options?.find((candidate) => candidate.id === id);
  if (option) return option.label;

  // Catalog-backed questions ('catalog-select', 'catalog-multiselect',
  // 'custom' skill/MCP pickers) resolve through the shared lookup.
  return lookup(id) ?? id;
}

/**
 * Human labels for a single raw value (catalog id, option id, boolean, free
 * text). Always returns one entry per selected value; an empty answer returns
 * an empty array.
 */
export function formatAnswerValue(
  question: DecisionQuestion | undefined,
  value: CreatorAnswerValue,
  lookup: LabelLookup,
  labels: Partial<AnswerLabels> = {},
): string[] {
  const {
    yesLabel = DEFAULT_LABELS.yesLabel,
    noLabel = DEFAULT_LABELS.noLabel,
    customPrefix = DEFAULT_LABELS.customPrefix,
  } = labels;

  if (typeof value === 'boolean') return [value ? yesLabel : noLabel];

  if (Array.isArray(value)) {
    return value
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .map((entry) => resolveId(question, entry, lookup, customPrefix));
  }

  const text = value.trim();
  if (text.length === 0) return [];

  // Free text passes through untouched; everything else is an id to resolve.
  if (question?.type === 'text' || question?.type === 'textarea') return [text];

  return [resolveId(question, text, lookup, customPrefix)];
}

/** Format a single answer, using the question metadata when available. */
export function formatAnswer(
  questionId: string,
  value: CreatorAnswerValue,
  question: DecisionQuestion | undefined,
  lookup: LabelLookup,
  labels: Partial<AnswerLabels> = {},
): FormattedAnswer {
  return {
    questionId,
    section: question?.section ?? labels.fallbackSection ?? DEFAULT_LABELS.fallbackSection,
    label: question?.prompt ?? questionId,
    values: formatAnswerValue(question, value, lookup, labels),
    raw: value,
    empty: isEmptyValue(value),
    custom: hasCustomEntry(value),
  };
}

/**
 * All answers, in `workflow.questions` declaration order, grouped by section.
 * Answers with no matching question are kept under `FALLBACK_SECTION` and
 * listed last — never silently dropped, so the user always sees everything
 * that will be sent to the backend.
 */
export function groupAnswersBySection(
  answers: CreatorAnswers,
  workflow: Workflow | null,
  lookup: LabelLookup,
  labels: Partial<AnswerLabels> = {},
): AnswerSection[] {
  const questions = new Map<string, DecisionQuestion>();
  for (const question of workflow?.questions ?? []) {
    questions.set(question.id, question);
  }

  const ordered: FormattedAnswer[] = [];
  const seen = new Set<string>();

  for (const question of workflow?.questions ?? []) {
    if (!(question.id in answers)) continue;
    seen.add(question.id);
    ordered.push(formatAnswer(question.id, answers[question.id], question, lookup, labels));
  }

  // Unknown ids keep their insertion order and come after the workflow ones.
  for (const [questionId, value] of Object.entries(answers)) {
    if (seen.has(questionId)) continue;
    ordered.push(formatAnswer(questionId, value, questions.get(questionId), lookup, labels));
  }

  const sections: AnswerSection[] = [];
  const bySection = new Map<string, AnswerSection>();

  for (const answer of ordered) {
    let group = bySection.get(answer.section);
    if (!group) {
      group = { section: answer.section, answers: [] };
      bySection.set(answer.section, group);
      sections.push(group);
    }
    group.answers.push(answer);
  }

  return sections;
}
