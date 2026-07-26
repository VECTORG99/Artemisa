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
    tagline: '~8 preguntas',
    description: 'Un test corto para entender qué necesitas. El resto se completa con valores seguros por defecto.',
    Icon: LuGauge,
  },
  {
    id: 'auto-largo',
    label: 'Auto-largo',
    tagline: 'Flujo completo',
    description: 'Recorre todo el árbol de decisiones para el control más afinado antes de revisar.',
    Icon: LuCompass,
  },
  {
    id: 'presets',
    label: 'Presets',
    tagline: 'Listos para usar',
    description: 'Configuraciones completas por caso de uso. Llega, revisa y ajusta lo que quieras antes de generar.',
    Icon: LuLayoutGrid,
  },
  {
    id: 'avanzado',
    label: 'Avanzado',
    tagline: 'Control total',
    description: 'Panel de control denso: modelo, proveedores, RAG, skills y MCPs configurados directamente.',
    Icon: LuSlidersHorizontal,
  },
];

/**
 * First screen of the Creator: four independent entry points sharing the
 * same underlying decision tree and bundle generator. Auto-corto and
 * Auto-largo both converge toward a preset-shaped result (with the user's
 * own variations) — Auto-corto via curated defaults, Auto-largo via the
 * full wizard.
 */
export function ModeSelect({ onSelect }: ModeSelectProps) {
  return (
    <div className="flex flex-col items-center gap-10 text-center">
      <div>
        <h1 className="text-3xl font-semibold text-white sm:text-4xl">¿Cómo quieres configurar tu agente?</h1>
        <p className="mx-auto mt-3 max-w-xl text-zinc-400">
          Los cuatro modos generan el mismo tipo de bundle. Puedes cambiar de opinión en cualquier momento.
        </p>
      </div>

      <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => onSelect(mode.id)}
            className={glassCardInteractive('flex flex-col items-center gap-3 rounded-3xl p-6 text-center')}
          >
            <mode.Icon className="h-7 w-7 text-zinc-400 transition-colors group-hover:text-white" aria-hidden="true" />
            <span className="text-base font-medium text-white">{mode.label}</span>
            <p className="text-xs leading-relaxed text-zinc-400">{mode.description}</p>
            <span className={glassPill('mt-1 text-[10px] text-zinc-400')}>{mode.tagline}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
