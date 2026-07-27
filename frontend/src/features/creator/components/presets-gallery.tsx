'use client';

import { useMemo, useState } from 'react';
import {
  LuArrowRight,
  LuBookOpen,
  LuBrainCircuit,
  LuDatabase,
  LuFileCode2,
  LuGitPullRequestArrow,
  LuLoaderCircle,
  LuServer,
  LuShieldCheck,
  LuWrench,
} from 'react-icons/lu';
import type { Catalog, CreatorAnswerValue } from '@artemisa/types';
import { buildLabelLookup } from '@/features/creator/lib/answer-labels';
import { glassCard, glassPill, glassPrimaryButton } from '@/lib/glass';
import { CREATOR_PRESETS, type CreatorPreset } from '../presets/presets';

interface PresetsGalleryProps {
  onSelect: (preset: CreatorPreset) => void;
  /** True while an /evaluate call for a preset is in flight. */
  applying?: boolean;
  catalog: Catalog | null;
}

const PURPOSE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'pr-review': LuGitPullRequestArrow,
  coding: LuFileCode2,
  devops: LuWrench,
  operations: LuServer,
  security: LuShieldCheck,
  'data-ai': LuDatabase,
  documentation: LuBookOpen,
};

const ENVIRONMENT_LABELS: Record<string, string> = {
  development: 'Desarrollo',
  production: 'Producción',
  both: 'Desarrollo + producción',
  testing: 'Testing / QA',
  staging: 'Staging / Pre-producción',
  local: 'Local / Recreativo',
};

const AUTONOMY_LABELS: Record<string, string> = {
  advisory: 'Sólo recomienda',
  assisted: 'Asistido',
  autonomous: 'Autónomo',
};

function asArray(value: CreatorAnswerValue | undefined): string[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Ready-to-use agent configurations. Selecting one evaluates its complete
 * answers against the backend and opens Review, where every answer is still
 * editable before generating.
 *
 * The cards summarise what the preset actually decides — environment, output
 * targets, autonomy, how many capabilities it grants — because "elige un punto
 * de partida" is not a real choice when the only visible difference between
 * eight cards is a sentence of prose.
 */
export function PresetsGallery({ onSelect, applying = false, catalog }: PresetsGalleryProps) {
  const [pending, setPending] = useState<string | null>(null);

  const lookup = useMemo(() => buildLabelLookup({ catalog }), [catalog]);

  function choose(preset: CreatorPreset) {
    setPending(preset.id);
    onSelect(preset);
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Presets</span>
        <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Elige un punto de partida</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
          Ocho configuraciones completas y validadas contra el árbol de decisiones. Ninguna se genera todavía: eliges
          una, la revisas y ajustas cualquier respuesta antes de generar el bundle.
        </p>
      </div>

      <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CREATOR_PRESETS.map((preset) => {
          const answers = preset.answers;
          const purpose = typeof answers.purpose === 'string' ? answers.purpose : '';
          const Icon = PURPOSE_ICONS[purpose] ?? LuBrainCircuit;
          const environment = typeof answers.environment === 'string' ? answers.environment : '';
          const autonomy = typeof answers.autonomy === 'string' ? answers.autonomy : '';
          const targets = asArray(answers.agent_targets);
          const technologies = asArray(answers.technologies);
          const capabilities = asArray(answers.capabilities);
          const isPending = applying && pending === preset.id;

          return (
            <div key={preset.id} className={glassCard('flex flex-col gap-3 rounded-3xl p-5')}>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04]">
                  <Icon className="h-4 w-4 text-zinc-300" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-base font-medium text-white">{preset.name}</h2>
                  <span className="text-[11px] uppercase tracking-wide text-zinc-500">{preset.tagline}</span>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-zinc-400">{preset.description}</p>

              <dl className="flex flex-col gap-1.5 border-t border-white/[0.06] pt-3 text-xs">
                <SummaryRow label="Entorno" value={ENVIRONMENT_LABELS[environment] ?? environment} />
                <SummaryRow label="Autonomía" value={AUTONOMY_LABELS[autonomy] ?? autonomy} />
                <SummaryRow label="Destinos" value={targets.map((id) => lookup(id) ?? id).join(', ') || '—'} />
                <SummaryRow label="Capacidades" value={`${capabilities.length} concedidas`} />
                <SummaryRow label="Stack" value={technologies.map((id) => lookup(id) ?? id).join(', ') || '—'} />
              </dl>

              <div className="flex flex-wrap gap-1.5">
                {answers.knowledge_enabled === true && (
                  <span className={glassPill('py-0.5 text-[10px] text-zinc-400')}>RAG</span>
                )}
                {answers.pr_review_enabled === true && (
                  <span className={glassPill('py-0.5 text-[10px] text-zinc-400')}>PR review</span>
                )}
                {answers.hooks_enabled === true && (
                  <span className={glassPill('py-0.5 text-[10px] text-zinc-400')}>Hooks</span>
                )}
                {answers.skills_enabled === true && (
                  <span className={glassPill('py-0.5 text-[10px] text-zinc-400')}>Skills</span>
                )}
                {answers.human_approval === true && (
                  <span className={glassPill('py-0.5 text-[10px] text-zinc-400')}>Aprobación humana</span>
                )}
              </div>

              <div className="mt-auto flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => choose(preset)}
                  disabled={applying}
                  className={glassPrimaryButton('px-4 py-2 text-xs')}
                >
                  {isPending ? (
                    <>
                      <LuLoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      Validando…
                    </>
                  ) : (
                    <>
                      Usar preset
                      <LuArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-[11px] leading-relaxed text-zinc-600">
        Un preset es sólo un conjunto de respuestas prellenadas. No hay presets en el backend: se validan con
        <code className="mx-1">/evaluate</code> igual que cualquier respuesta manual.
      </p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="w-20 shrink-0 text-zinc-600">{label}</dt>
      <dd className="min-w-0 flex-1 truncate text-zinc-300" title={value}>
        {value || '—'}
      </dd>
    </div>
  );
}
