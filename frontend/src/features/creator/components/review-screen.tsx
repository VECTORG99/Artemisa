'use client';

import { useMemo, useState } from 'react';
import {
  LuChevronDown,
  LuCircleAlert,
  LuInfo,
  LuLoaderCircle,
  LuPencil,
  LuSparkles,
  LuTriangleAlert,
} from 'react-icons/lu';
import { glassCard, glassNotice, glassPill, glassPrimaryButton } from '@/lib/glass';
import { buildLabelLookup, groupAnswersBySection, type FormattedAnswer } from '@/features/creator/lib/answer-labels';
import { TechIcon } from '@/features/creator/lib/tech-icons';
import { useTranslations } from '@/i18n';
import type { AnswerIssue, Catalog, CreatorAnswers, CreatorRecommendation, Workflow } from '@artemisa/types';

interface ReviewScreenProps {
  answers: CreatorAnswers;
  workflow: Workflow | null;
  catalog: Catalog | null;
  recommendations: CreatorRecommendation[];
  warnings: string[];
  issues: AnswerIssue[];
  onGenerate: () => void;
  /** Opens a single question for editing and returns here once answered. */
  onEditAnswer: (questionId: string) => void;
  generating: boolean;
  error?: string;
}

type SeverityConfig = Record<
  CreatorRecommendation['severity'],
  { className: string; Icon: React.ComponentType<{ className?: string }> }
>;

const SEVERITY_CONFIG: SeverityConfig = {
  warning: { className: 'text-warn', Icon: LuTriangleAlert },
  recommended: { className: 'text-zinc-200', Icon: LuSparkles },
  info: { className: 'text-zinc-400', Icon: LuInfo },
};

const SEVERITY_ORDER: CreatorRecommendation['severity'][] = ['warning', 'recommended', 'info'];

/**
 * Final review before generation.
 *
 * Two things this screen must not do, both of which it used to: show internal
 * question ids and catalog ids instead of labels (issue #435), and show a
 * recommendation as a title plus one sentence when the backend actually sends
 * evidence, benefits, trade-offs and alternatives for each one — the whole
 * point of calling them "explicables".
 */
export function ReviewScreen({
  answers,
  workflow,
  catalog,
  recommendations,
  warnings,
  issues,
  onGenerate,
  onEditAnswer,
  generating,
  error,
}: ReviewScreenProps) {
  const t = useTranslations('review');
  const common = useTranslations('common');
  const optionPicker = useTranslations('optionPicker');

  const lookup = useMemo(() => buildLabelLookup({ catalog }), [catalog]);
  const answerLabels = useMemo(
    () => ({
      yesLabel: common.yes,
      noLabel: common.no,
      customPrefix: optionPicker.custom.chipPrefix,
      fallbackSection: t.fallbackSectionName,
    }),
    [common, optionPicker, t],
  );
  const sections = useMemo(
    () => groupAnswersBySection(answers, workflow, lookup, answerLabels),
    [answers, workflow, lookup, answerLabels],
  );

  const sorted = useMemo(
    () => [...recommendations].sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)),
    [recommendations],
  );

  const answeredCount = sections.reduce(
    (total, section) => total + section.answers.filter((answer) => !answer.empty).length,
    0,
  );
  const customCount = sections.reduce(
    (total, section) => total + section.answers.filter((answer) => answer.custom).length,
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{t.title}</span>
        <h2 className="mt-3 text-2xl font-semibold text-white">{t.heading}</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-zinc-400">{t.description}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className={glassPill('py-0.5 text-[11px] text-zinc-400')}>
            {t.answeredCount.replace('{count}', String(answeredCount))}
          </span>
          <span className={glassPill('py-0.5 text-[11px] text-zinc-400')}>
            {t.recommendationsCount.replace('{count}', String(recommendations.length))}
          </span>
          {warnings.length > 0 && (
            <span className={glassPill('border-warn/30 py-0.5 text-[11px] text-warn')}>
              {t.warningsCount.replace('{count}', String(warnings.length))}
            </span>
          )}
          {customCount > 0 && (
            <span className={glassPill('py-0.5 text-[11px] text-zinc-400')}>
              {t.customCount.replace('{count}', String(customCount))}
            </span>
          )}
        </div>
      </div>

      {issues.length > 0 && (
        <div className={glassNotice('danger', 'flex-col')} role="alert">
          <span className="flex items-center gap-2 font-medium">
            <LuCircleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t.backendRejected}
          </span>
          <ul className="ml-6 list-disc space-y-0.5">
            {issues.map((issue, index) => (
              <li key={index}>
                <code className="text-xs">{issue.path.replace(/^answers\./, '')}</code> — {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className={glassNotice('warn', 'flex-col')}>
          <span className="flex items-center gap-2 font-medium">
            <LuTriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t.decisionTreeWarnings}
          </span>
          <ul className="ml-6 list-disc space-y-1 text-amber-100/90">
            {warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">{t.whyBundle}</h3>
        {sorted.length === 0 && <p className={glassNotice('neutral', 'text-zinc-500')}>{t.noRecommendations}</p>}
        <div className="grid gap-3 lg:grid-cols-2">
          {sorted.map((recommendation) => (
            <RecommendationCard key={recommendation.id} recommendation={recommendation} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">{t.yourDecisions}</h3>
        <div className="grid gap-3 lg:grid-cols-2">
          {sections.map((section) => (
            <div key={section.section} className={glassCard('flex flex-col gap-2 rounded-2xl p-4')}>
              <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                {section.section}
                {section.section === t.fallbackSectionName && (
                  <span className="ml-2 normal-case text-zinc-600">{t.fallbackSectionHint}</span>
                )}
              </span>
              <dl className="flex flex-col divide-y divide-white/[0.05]">
                {section.answers.map((answer) => (
                  <AnswerRow key={answer.questionId} answer={answer} onEdit={onEditAnswer} />
                ))}
              </dl>
            </div>
          ))}
        </div>
      </section>

      {error && (
        <div className={glassNotice('danger')} role="alert">
          <LuCircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating || issues.length > 0}
          className={glassPrimaryButton('text-sm')}
        >
          {generating ? (
            <>
              <LuLoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t.generating}
            </>
          ) : (
            t.generate
          )}
        </button>
        <p className="text-[11px] text-zinc-600">{issues.length > 0 ? t.fixBeforeGenerate : t.deterministicInfo}</p>
      </div>
    </div>
  );
}

function AnswerRow({ answer, onEdit }: { answer: FormattedAnswer; onEdit: (questionId: string) => void }) {
  const t = useTranslations('review');
  // agent_targets is the one answer where the icon communicates the most: it
  // tells the user which agent platforms the bundle targets. The raw value is
  // the catalog id array (same order as `values`), so we pair them and render
  // a chip per platform with its brand icon. Other answers stay as joined text.
  const platformChips =
    answer.questionId === 'agent_targets' && Array.isArray(answer.raw) && !answer.empty
      ? (answer.raw as string[]).map((id, index) => ({ id, label: answer.values[index] ?? id }))
      : null;

  return (
    <div className="group flex items-start gap-3 py-2 first:pt-0 last:pb-0">
      <dt className="min-w-0 flex-1 text-xs leading-relaxed text-zinc-500">{answer.label}</dt>
      <dd className="flex min-w-0 max-w-[58%] shrink-0 items-start justify-end gap-2">
        {answer.empty ? (
          <span className="break-words text-right text-sm text-zinc-600">{t.emptyAnswer}</span>
        ) : platformChips ? (
          <ul className="flex flex-wrap justify-end gap-1.5">
            {platformChips.map((chip) => (
              <li key={chip.id}>
                <span className={glassPill('inline-flex items-center gap-1.5 px-2 py-0.5 text-xs text-zinc-200')}>
                  <TechIcon id={chip.id} category="agent-platform" className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                  {chip.label}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <span className="break-words text-right text-sm text-zinc-200">{answer.values.join(', ')}</span>
        )}
        <button
          type="button"
          onClick={() => onEdit(answer.questionId)}
          aria-label={t.editAria.replace('{label}', answer.label)}
          title={t.editTitle}
          className="mt-0.5 shrink-0 rounded-full p-1 text-zinc-600 opacity-0 transition-all hover:bg-white/[0.06] hover:text-white focus-visible:opacity-100 group-hover:opacity-100"
        >
          <LuPencil className="h-3 w-3" aria-hidden="true" />
        </button>
      </dd>
    </div>
  );
}

function RecommendationCard({ recommendation }: { recommendation: CreatorRecommendation }) {
  const t = useTranslations('review');
  const [open, setOpen] = useState(false);
  const severity = SEVERITY_CONFIG[recommendation.severity];
  const severityLabel = t.severity[recommendation.severity];
  const hasDetail =
    recommendation.evidence.length > 0 ||
    recommendation.benefits.length > 0 ||
    recommendation.tradeoffs.length > 0 ||
    recommendation.alternatives.length > 0;

  return (
    <div className={glassCard('flex flex-col gap-2 rounded-2xl p-4')}>
      <div className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 items-start gap-2">
          <severity.Icon className={`mt-0.5 h-4 w-4 shrink-0 ${severity.className}`} aria-hidden="true" />
          <span className="text-sm font-medium text-zinc-100">{recommendation.title}</span>
        </span>
        <span className={glassPill(`shrink-0 py-0.5 text-[10px] uppercase ${severity.className}`)}>
          {severityLabel}
        </span>
      </div>

      <p className="text-sm leading-relaxed text-zinc-400">{recommendation.reason}</p>

      {hasDetail && (
        <>
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            className="inline-flex w-fit items-center gap-1 text-xs text-zinc-500 transition-colors hover:text-zinc-200"
          >
            <LuChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
            {open ? t.recommendation.hideDetail : t.recommendation.showDetail}
          </button>

          {open && (
            <div className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-black/20 p-3">
              <DetailList title={t.recommendation.evidence} items={recommendation.evidence} />
              <DetailList title={t.recommendation.benefits} items={recommendation.benefits} />
              <DetailList title={t.recommendation.tradeoffs} items={recommendation.tradeoffs} />
              <DetailList title={t.recommendation.alternatives} items={recommendation.alternatives} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{title}</span>
      <ul className="ml-4 list-disc space-y-0.5 text-xs leading-relaxed text-zinc-400">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
