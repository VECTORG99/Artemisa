'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  LuBrainCircuit,
  LuCircleAlert,
  LuDatabase,
  LuFolderGit2,
  LuKeyRound,
  LuLayers,
  LuLoaderCircle,
  LuSearch,
  LuServer,
  LuTarget,
  LuWrench,
  LuX,
} from 'react-icons/lu';
import type {
  AnswerIssue,
  Catalog,
  CatalogItem,
  CreatorAnswers,
  CreatorAnswerValue,
  DecisionQuestion,
  QuestionCondition,
  Workflow,
} from '@artemisa/types';
import { glassInput, glassNotice, glassPanel, glassPill, glassPrimaryButton } from '@/lib/glass';
import { useTranslations } from '@/i18n';
import { Switch } from './switch';
import { SkillsBrowser } from './skills-browser';
import { McpBrowser } from './mcp-browser';
import { OptionPicker, type PickerOption } from './option-picker';

// ─── Section map ──────────────────────────────────────────────────────────────
// Groups the backend workflow's questions into dense dashboard sections.
// Question IDs are the contract (see GET /api/v1/creator/workflow); anything
// the backend adds later that isn't listed here still renders, under "Otros",
// so a new workflow question is never silently dropped from this panel.

type SectionId = 'identity' | 'project' | 'environments' | 'devops' | 'permissions' | 'knowledge' | 'output' | 'other';

interface Section {
  id: SectionId;
  Icon: React.ComponentType<{ className?: string }>;
  questionIds: string[];
}

const SECTIONS: Section[] = [
  {
    id: 'identity',
    Icon: LuTarget,
    questionIds: ['agent_name', 'purpose', 'objective', 'success_criteria', 'agent_persona'],
  },
  {
    id: 'project',
    Icon: LuFolderGit2,
    questionIds: ['project_stage', 'technologies', 'architecture', 'repository_provider'],
  },
  {
    id: 'environments',
    Icon: LuServer,
    questionIds: ['environment', 'development_setup', 'testing_tools', 'deployment_target', 'container_platforms'],
  },
  {
    id: 'devops',
    Icon: LuWrench,
    questionIds: ['ci_cd', 'infrastructure', 'observability', 'security_controls'],
  },
  {
    id: 'permissions',
    Icon: LuKeyRound,
    questionIds: ['capabilities', 'autonomy', 'human_approval'],
  },
  {
    id: 'knowledge',
    Icon: LuDatabase,
    questionIds: ['knowledge_enabled', 'knowledge_sources', 'pr_review_enabled', 'pr_review_focus'],
  },
  {
    id: 'output',
    Icon: LuLayers,
    questionIds: [
      'agent_targets',
      'hooks_enabled',
      'skills_enabled',
      'skills_focus',
      'skills_selection',
      'mcps_enabled',
      'mcps_selection',
    ],
  },
];

const ORPHAN_SECTION: Section = {
  id: 'other',
  Icon: LuBrainCircuit,
  questionIds: [],
};

const MAPPED_IDS = new Set(SECTIONS.flatMap((section) => section.questionIds));

// ─── Answer helpers ───────────────────────────────────────────────────────────

/**
 * Mirrors `conditionMatches` in src/creator/decisionTree.ts so the dashboard
 * hides the exact same branches the backend would discard. Without this, a
 * user could fill a field the backend then drops as "not visible" (the cause
 * of skills_selection being silently ignored before).
 */
function conditionMatches(condition: QuestionCondition, answers: CreatorAnswers): boolean {
  switch (condition.operator) {
    case 'equals':
      return answers[condition.questionId] === condition.value;
    case 'oneOf':
      return condition.values.some((value) => answers[condition.questionId] === value);
    case 'includes': {
      const answer = answers[condition.questionId];
      return Array.isArray(answer) && answer.includes(condition.value);
    }
    case 'all':
      return condition.conditions.every((item) => conditionMatches(item, answers));
    case 'any':
      return condition.conditions.some((item) => conditionMatches(item, answers));
  }
}

/** Mirrors `isAnswered` in the backend decision tree. */
function isAnswered(value: CreatorAnswerValue | undefined): boolean {
  if (value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'boolean') return true;
  return value.length > 0;
}

function questionDomId(id: string): string {
  return `advanced-question-${id}`;
}

interface FineTuningDashboardProps {
  answers: CreatorAnswers;
  onChange: (next: CreatorAnswers) => void;
  onGenerate: () => void;
  generating: boolean;
  error?: string;
  /** Validation issues from the last /evaluate call, shown next to their question. */
  issues?: AnswerIssue[];
  /** Fetched once by the page — the dashboard never re-requests them. */
  catalog: Catalog | null;
  workflow: Workflow | null;
}

/**
 * Dense, all-at-once configuration panel for advanced mode. Every control is
 * generated from the backend workflow contract (question id, type, options,
 * maxSelections, visibleWhen) instead of a hand-copied list, so the panel
 * always produces answers the decision tree accepts and stays correct when
 * the workflow changes.
 *
 * Three zones: sections on the left, the active section's controls in the
 * middle, and a right rail listing exactly what still blocks generation. The
 * rail exists because "faltan 6 respuestas obligatorias" is not actionable
 * when the missing ones are spread across four collapsed sections.
 */
export function FineTuningDashboard({
  answers,
  onChange,
  onGenerate,
  generating,
  error,
  issues = [],
  catalog,
  workflow,
}: FineTuningDashboardProps) {
  const common = useTranslations('common');
  const t = useTranslations('creator');
  const [activeSection, setActiveSection] = useState<SectionId>('identity');
  const [search, setSearch] = useState('');

  const setAnswer = useCallback(
    (key: string, value: CreatorAnswerValue) => onChange({ ...answers, [key]: value }),
    [answers, onChange],
  );

  /** Catalog items indexed by category once, instead of filtering per render. */
  const itemsByCategory = useMemo(() => {
    const map = new Map<string, CatalogItem[]>();
    for (const item of catalog?.items ?? []) {
      const list = map.get(item.category);
      if (list) list.push(item);
      else map.set(item.category, [item]);
    }
    return map;
  }, [catalog]);

  const questionsById = useMemo(() => {
    const map = new Map<string, DecisionQuestion>();
    for (const question of workflow?.questions ?? []) map.set(question.id, question);
    return map;
  }, [workflow]);

  /**
   * Visible questions in the backend's declaration order, resolved against
   * the answers accumulated so far — same single pass the decision tree does.
   */
  const visibleQuestions = useMemo(() => {
    const resolved: CreatorAnswers = {};
    const visible: DecisionQuestion[] = [];
    for (const question of workflow?.questions ?? []) {
      if (question.visibleWhen && !conditionMatches(question.visibleWhen, resolved)) continue;
      visible.push(question);
      const value = answers[question.id];
      if (value !== undefined) resolved[question.id] = value;
    }
    return visible;
  }, [workflow, answers]);

  const visibleIds = useMemo(() => new Set(visibleQuestions.map((q) => q.id)), [visibleQuestions]);

  const orphanQuestions = useMemo(
    () => visibleQuestions.filter((question) => !MAPPED_IDS.has(question.id) && question.section !== 'answers'),
    [visibleQuestions],
  );

  const sectionsToRender = useMemo(
    () => (orphanQuestions.length > 0 ? [...SECTIONS, ORPHAN_SECTION] : SECTIONS),
    [orphanQuestions.length],
  );

  const questionsOfSection = useCallback(
    (section: Section): DecisionQuestion[] =>
      section.id === 'other'
        ? orphanQuestions
        : section.questionIds
            .map((id) => questionsById.get(id))
            .filter((q): q is DecisionQuestion => Boolean(q && visibleIds.has(q.id))),
    [orphanQuestions, questionsById, visibleIds],
  );

  /** Per-section required/answered counters shown as sidebar badges. */
  const sectionProgress = useMemo(() => {
    const progress = new Map<SectionId, { required: number; answered: number; missing: number }>();
    for (const section of sectionsToRender) {
      let required = 0;
      let answered = 0;
      for (const question of questionsOfSection(section)) {
        if (!question.required) continue;
        required += 1;
        if (isAnswered(answers[question.id])) answered += 1;
      }
      progress.set(section.id, { required, answered, missing: required - answered });
    }
    return progress;
  }, [sectionsToRender, questionsOfSection, answers]);

  /** Mirrors the backend's `progress.complete`: every visible required
   * question answered. The button is only enabled when /evaluate will
   * actually return a complete tree. */
  const missingRequired = useMemo(
    () => visibleQuestions.filter((question) => question.required && !isAnswered(answers[question.id])),
    [visibleQuestions, answers],
  );

  const readyToGenerate = missingRequired.length === 0 && visibleQuestions.length > 0;

  const issuesByQuestion = useMemo(() => {
    const map = new Map<string, AnswerIssue[]>();
    for (const issue of issues) {
      const id = issue.path.replace(/^answers\./, '');
      const list = map.get(id);
      if (list) list.push(issue);
      else map.set(id, [issue]);
    }
    return map;
  }, [issues]);

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return null;
    return visibleQuestions.filter(
      (question) =>
        question.prompt.toLowerCase().includes(query) ||
        question.description.toLowerCase().includes(query) ||
        question.section.toLowerCase().includes(query) ||
        question.id.toLowerCase().includes(query),
    );
  }, [search, visibleQuestions]);

  const active = sectionsToRender.find((section) => section.id === activeSection) ?? SECTIONS[0];
  const activeQuestions = questionsOfSection(active);

  if (!workflow || !catalog) {
    return (
      <div className={`flex h-[70vh] items-center justify-center rounded-3xl ${glassPanel()}`} role="status">
        <p className="flex items-center gap-2 text-sm text-zinc-500">
          <LuLoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          {t.fineTuning.loading}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)]">
      {/* ── Sections ───────────────────────────────────────────────────────── */}
      <aside className={`flex h-[76vh] min-h-0 flex-col rounded-3xl p-3 ${glassPanel()}`}>
        <nav className="creator-scroll flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto" aria-label="Secciones">
          {sectionsToRender.map((section) => {
            const isActive = section.id === activeSection;
            const progress = sectionProgress.get(section.id);
            const sectionText =
              section.id === 'other'
                ? t.fineTuning.orphanSection
                : t.fineTuning.sections[section.id as Exclude<SectionId, 'other'>];
            const incomplete = (progress?.missing ?? 0) > 0;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => {
                  setSearch('');
                  setActiveSection(section.id);
                }}
                aria-current={isActive ? 'true' : undefined}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                  isActive
                    ? 'border border-accent/40 bg-accent-deep/20 text-white'
                    : 'border border-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
                }`}
              >
                <section.Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate" title={sectionText.label}>
                  {sectionText.label}
                </span>
                {progress && progress.required > 0 && (
                  <span
                    className={`shrink-0 text-[10px] tabular-nums ${incomplete ? 'text-warn' : 'text-zinc-500'}`}
                    title={t.fineTuning.requiredCounter
                      .replace('{answered}', String(progress.answered))
                      .replace('{required}', String(progress.required))}
                  >
                    {incomplete ? `${progress.answered}/${progress.required}` : '✓'}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-3 shrink-0 border-t border-white/[0.06] pt-3">
          <button
            type="button"
            onClick={onGenerate}
            disabled={!readyToGenerate || generating}
            className={glassPrimaryButton('w-full px-4 py-2.5 text-sm')}
          >
            {generating ? (
              <>
                <LuLoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                {common.loading}
              </>
            ) : (
              t.fineTuning.generateButton
            )}
          </button>
          <p className="mt-2 text-center text-[11px] leading-relaxed text-zinc-600">
            {readyToGenerate
              ? t.fineTuning.treeComplete
              : t.fineTuning.missingRequired.replace('{count}', String(missingRequired.length))}
          </p>
        </div>
      </aside>

      {/* ── Active section ─────────────────────────────────────────────────── */}
      <div className={`flex h-[76vh] min-h-0 min-w-0 flex-col rounded-3xl ${glassPanel()}`}>
        <header className="shrink-0 border-b border-white/[0.06] p-5 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04]">
              <active.Icon className="h-4 w-4 text-zinc-300" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-white">
                {searchResults
                  ? t.fineTuning.searchResultsTitle.replace('{query}', search.trim())
                  : active.id === 'other'
                    ? t.fineTuning.orphanSection.label
                    : t.fineTuning.sections[active.id as Exclude<SectionId, 'other'>].label}
              </h2>
              <p className="mt-0.5 text-sm text-zinc-500">
                {searchResults
                  ? t.fineTuning.searchResults.replace('{count}', String(searchResults.length))
                  : active.id === 'other'
                    ? t.fineTuning.orphanSection.description
                    : t.fineTuning.sections[active.id as Exclude<SectionId, 'other'>].description}
              </p>
            </div>
          </div>

          <div className="relative mt-4">
            <LuSearch
              className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t.fineTuning.searchPlaceholder}
              aria-label={t.fineTuning.searchAriaLabel}
              className={glassInput('py-2 pl-9 text-sm')}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label={common.close}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-500 transition-colors hover:text-white"
              >
                <LuX className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </header>

        <div className="creator-scroll min-h-0 flex-1 overflow-y-auto p-5 sm:px-6">
          {error && (
            <div className={glassNotice('danger', 'mb-6')} role="alert">
              <LuCircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-6">
            {(searchResults ?? activeQuestions).length === 0 && (
              <p className="py-8 text-center text-sm text-zinc-500">
                {searchResults ? t.fineTuning.noSearchResults : t.fineTuning.noActiveQuestions}
              </p>
            )}

            {(searchResults ?? activeQuestions).map((question) => (
              <QuestionControl
                key={question.id}
                question={question}
                value={answers[question.id]}
                onChange={(next) => setAnswer(question.id, next)}
                catalogItems={(question.catalogCategories ?? []).flatMap((c) => itemsByCategory.get(c) ?? [])}
                issues={issuesByQuestion.get(question.id) ?? []}
                showSection={Boolean(searchResults)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Question renderer ────────────────────────────────────────────────────────

interface QuestionControlProps {
  question: DecisionQuestion;
  value: CreatorAnswerValue | undefined;
  onChange: (next: CreatorAnswerValue) => void;
  catalogItems: CatalogItem[];
  issues: AnswerIssue[];
  /** Search results span sections, so each result names its own. */
  showSection: boolean;
}

function toPickerOptions(items: CatalogItem[]): PickerOption[] {
  return items.map((item) => ({
    id: item.id,
    label: item.label,
    description: item.description,
    category: item.category,
    tags: item.tags,
  }));
}

function QuestionControl({ question, value, onChange, catalogItems, issues, showSection }: QuestionControlProps) {
  const common = useTranslations('common');
  const selectedArray = Array.isArray(value) ? value : [];

  const body = (() => {
    if (question.type === 'text' || question.type === 'textarea') {
      const id = questionDomId(question.id);
      const max = question.type === 'textarea' ? 4000 : 120;
      return question.type === 'textarea' ? (
        <textarea
          id={id}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
          maxLength={max}
          placeholder={question.placeholder}
          className={glassInput('creator-scroll resize-none')}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
          maxLength={max}
          placeholder={question.placeholder}
          className={glassInput()}
        />
      );
    }

    if (question.type === 'select' || question.type === 'multiselect') {
      const multiple = question.type === 'multiselect';
      return (
        <OptionPicker
          options={(question.options ?? []).map((option) => ({
            id: option.id,
            label: option.label,
            description: option.description,
          }))}
          multiple={multiple}
          value={multiple ? selectedArray : typeof value === 'string' ? value : ''}
          onChange={onChange}
          max={multiple ? question.maxSelections : undefined}
          ariaLabel={question.prompt}
          maxHeightClass="max-h-72"
          showIcons={false}
          collapsible
        />
      );
    }

    // `custom` covers skills_selection / mcps_selection, which reuse the
    // dedicated browsers. Those endpoints are broader than the catalog
    // categories the tree validates against, so they are restricted to the
    // accepted ids — otherwise a valid-looking pick fails /evaluate.
    if (question.type === 'custom') {
      const allowedIds = catalogItems.map((item) => item.id);
      if ((question.catalogCategories ?? []).includes('skill')) {
        return <SkillsBrowser selected={selectedArray} onChange={onChange} allowedIds={allowedIds} />;
      }
      if ((question.catalogCategories ?? []).includes('mcp')) {
        return <McpBrowser selected={selectedArray} onChange={onChange} allowedIds={allowedIds} />;
      }
      return (
        <OptionPicker
          options={toPickerOptions(catalogItems)}
          multiple
          value={selectedArray}
          onChange={onChange}
          max={question.maxSelections}
          ariaLabel={question.prompt}
          maxHeightClass="max-h-72"
          allowCustom
          collapsible
        />
      );
    }

    const multiple = question.type === 'catalog-multiselect';
    return (
      <OptionPicker
        options={toPickerOptions(catalogItems)}
        multiple={multiple}
        value={multiple ? selectedArray : typeof value === 'string' ? value : ''}
        onChange={onChange}
        max={multiple ? question.maxSelections : undefined}
        ariaLabel={question.prompt}
        maxHeightClass="max-h-72"
        allowCustom
        collapsible
      />
    );
  })();

  // Boolean → switch. Renders its own label, so no outer Field wrapper.
  if (question.type === 'boolean') {
    return (
      <div id={questionDomId(question.id)} className="flex flex-col gap-2 scroll-mt-4">
        {showSection && <SectionTag section={question.section} />}
        <Switch
          label={question.prompt}
          description={question.description}
          checked={value === true}
          onChange={(next) => onChange(next)}
        />
        <IssueList issues={issues} />
      </div>
    );
  }

  const htmlFor = question.type === 'text' || question.type === 'textarea' ? questionDomId(question.id) : undefined;

  return (
    <div id={htmlFor ? undefined : questionDomId(question.id)} className="flex flex-col gap-2 scroll-mt-4">
      {showSection && <SectionTag section={question.section} />}
      <div className="flex items-baseline justify-between gap-3">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            {question.prompt}
            {question.required && <RequiredMark />}
          </label>
        ) : (
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            {question.prompt}
            {question.required && <RequiredMark />}
          </span>
        )}
        {!question.required && <span className={glassPill('py-0 text-[10px] text-zinc-600')}>{common.optional}</span>}
      </div>
      {question.description && <p className="-mt-1 text-xs leading-relaxed text-zinc-500">{question.description}</p>}
      {body}
      <IssueList issues={issues} />
    </div>
  );
}

function RequiredMark() {
  const common = useTranslations('common');
  return (
    <span className="ml-1 text-red-500" title={common.required} aria-label={common.requiredAria}>
      *
    </span>
  );
}

function SectionTag({ section }: { section: string }) {
  return <span className={glassPill('w-fit py-0 text-[10px] text-zinc-500')}>{section}</span>;
}

function IssueList({ issues }: { issues: AnswerIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <div className={glassNotice('danger', 'mt-1 py-2 text-xs')} role="alert">
      <LuCircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="flex flex-col gap-0.5">
        {issues.map((issue, index) => (
          <span key={index}>{issue.message}</span>
        ))}
      </span>
    </div>
  );
}
