'use client';

import { glassCardInteractive } from '@/lib/glass';

export type CreatorMode = 'automated' | 'fine-tuning';

interface ModeSelectProps {
  onSelect: (mode: CreatorMode) => void;
}

/**
 * First screen of the Creator: choose Automated (guided questions with
 * sensible presets) or Fine-tuning (manual control over model, skills, MCPs,
 * and the agent's "soul" — tone, style, restrictions). Both modes share the
 * same underlying decision-tree flow; fine-tuning just exposes more controls
 * by default and unlocks the "Avanzado" panel on more questions.
 */
export function ModeSelect({ onSelect }: ModeSelectProps) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-semibold text-zinc-50">¿Cómo quieres configurar tu agente?</h1>
        <p className="mt-3 text-zinc-400">
          Ambos modos generan el mismo tipo de bundle. Puedes cambiar de opinión en cualquier pregunta.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onSelect('automated')}
          className={glassCardInteractive('flex flex-col gap-3 p-6 text-left')}
        >
          <span className="text-lg font-medium text-zinc-100">Automated</span>
          <p className="text-sm text-zinc-400">
            Preguntas guiadas que derivan a presets recomendados. Más simple, más rápido — ideal si no necesitas
            controlar cada detalle.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onSelect('fine-tuning')}
          className={glassCardInteractive('flex flex-col gap-3 p-6 text-left')}
        >
          <span className="text-lg font-medium text-zinc-100">Fine-tuning</span>
          <p className="text-sm text-zinc-400">
            Elige manualmente skills, MCPs y el estilo del agente — su tono, restricciones y forma de escribir.
            Parámetros ultra técnicos del modelo quedan disponibles bajo &quot;Avanzado&quot;.
          </p>
        </button>
      </div>
    </div>
  );
}
