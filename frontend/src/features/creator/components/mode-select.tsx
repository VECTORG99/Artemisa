'use client';

import { LuCompass, LuGauge, LuLayoutGrid, LuSlidersHorizontal } from 'react-icons/lu';
import { glassCardInteractive, glassPill } from '@/lib/glass';

export type CreatorMode = 'auto-corto' | 'auto-largo' | 'presets' | 'avanzado';

interface ModeSelectProps {
  onSelect: (mode: CreatorMode) => void;
}

const MODES: {
  id: CreatorMode;
  label: string;
  tagline: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'auto-corto',
    label: 'Auto-corto',
    tagline: '8 preguntas',
    description: 'Responde lo esencial y nosotros completamos el resto con valores seguros.',
    Icon: LuGauge,
  },
  {
    id: 'auto-largo',
    label: 'Auto-largo',
    tagline: '32 preguntas',
    description: 'Decide tú cada detalle, pregunta por pregunta.',
    Icon: LuCompass,
  },
  {
    id: 'presets',
    label: 'Presets',
    tagline: '8 presets',
    description: 'Elige una configuración lista y ajústala a tu gusto.',
    Icon: LuLayoutGrid,
  },
  {
    id: 'avanzado',
    label: 'Avanzado',
    tagline: 'Máximo control',
    description: 'Todo en un solo panel, sin recorrido guiado.',
    Icon: LuSlidersHorizontal,
  },
];

/**
 * First screen of the Creator: four entry points over the same decision tree
 * and the same bundle generator. They differ only in how many decisions the
 * user makes explicitly — every one ends at the same Review screen, where any
 * answer can still be changed.
 */
export function ModeSelect({ onSelect }: ModeSelectProps) {
  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <div>
        <h1 className="text-3xl font-semibold text-white sm:text-4xl">¿Cómo quieres configurar tu agente?</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
          Los cuatro modos generan el mismo tipo de bundle y terminan en la misma revisión. Puedes cambiar de modo en
          cualquier momento sin perder lo que ya respondiste.
        </p>
      </div>

      <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => onSelect(mode.id)}
            className={glassCardInteractive(
              'flex flex-col items-center gap-3 rounded-3xl p-6 text-center hover:border-accent/40',
            )}
          >
            <mode.Icon className="h-7 w-7 text-zinc-400 transition-colors group-hover:text-accent" aria-hidden="true" />
            <span className="text-base font-medium text-white">{mode.label}</span>
            <p className="flex-1 text-xs leading-relaxed text-zinc-400">{mode.description}</p>
            <span className={glassPill('mt-1 py-0.5 text-[10px] text-zinc-400')}>{mode.tagline}</span>
          </button>
        ))}
      </div>

      <p className="text-[11px] text-zinc-600">
        Pulsa <kbd className="rounded border border-white/[0.08] px-1 font-mono">?</kbd> para ver los atajos de teclado.
      </p>
    </div>
  );
}
