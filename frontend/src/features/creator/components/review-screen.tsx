'use client';

import { glassCard, glassPill } from '@/lib/glass';
import type { CreatorAnswers, DecisionEvaluation } from '@huascar/types';

interface ReviewScreenProps {
  answers: CreatorAnswers;
  recommendations: DecisionEvaluation['recommendations'];
  warnings: string[];
  onGenerate: () => void;
  generating: boolean;
  error?: string;
}

/**
 * Final review before generation: shows every collected answer plus the
 * backend's deterministic recommendations and warnings (see
 * src/creator/decisionTree.ts buildRecommendations/buildWarnings) so the
 * user sees *why* the bundle will look the way it does before committing.
 */
export function ReviewScreen({ answers, recommendations, warnings, onGenerate, generating, error }: ReviewScreenProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Revisión final</span>
        <h2 className="mt-3 text-2xl font-semibold text-zinc-50">Confirma antes de generar</h2>
        <p className="mt-2 text-zinc-400">Nada se ejecuta ni se escribe todavía — esto es una vista previa.</p>
      </div>

      {warnings.length > 0 && (
        <div className={glassCard('flex flex-col gap-2 border-amber-500/30 bg-amber-500/[0.04] p-4')}>
          <span className="text-xs font-medium uppercase tracking-wide text-amber-300">Advertencias</span>
          {warnings.map((warning, index) => (
            <p key={index} className="text-sm text-amber-100">
              {warning}
            </p>
          ))}
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="flex flex-col gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Recomendaciones</span>
          {recommendations.map((rec) => (
            <div key={rec.id} className={glassCard('flex flex-col gap-2 p-4')}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-zinc-100">{rec.title}</span>
                <span className={glassPill('text-[10px] uppercase text-zinc-500')}>{rec.severity}</span>
              </div>
              <p className="text-sm text-zinc-400">{rec.reason}</p>
            </div>
          ))}
        </div>
      )}

      <div className={glassCard('flex flex-col gap-3 p-4')}>
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Respuestas</span>
        <dl className="grid gap-3 sm:grid-cols-2">
          {Object.entries(answers).map(([key, item]) => (
            <div key={key}>
              <dt className="text-xs text-zinc-600">{key}</dt>
              <dd className="break-words text-sm text-zinc-300">
                {Array.isArray(item) ? item.join(', ') : String(item)}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}

      <button
        type="button"
        onClick={onGenerate}
        disabled={generating}
        className="self-start rounded-full border border-white/[0.08] bg-white/[0.06] px-6 py-3 text-sm font-medium text-zinc-100 transition-colors hover:border-white/20 hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {generating ? 'Generando...' : 'Generar agente'}
      </button>
    </div>
  );
}
