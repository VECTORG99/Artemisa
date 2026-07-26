'use client';

import { LuArrowRight } from 'react-icons/lu';
import { glassCardInteractive, glassPill } from '@/lib/glass';
import { GlassIconButton } from '@/components/ui/glass-icon-button';
import { CREATOR_PRESETS, type CreatorPreset } from '../presets/presets';

interface PresetsGalleryProps {
  onSelect: (preset: CreatorPreset) => void;
  onBack: () => void;
}

/**
 * Ready-to-use agent configurations — "llegar y copiar". Selecting one
 * evaluates its complete answers against the backend, then opens Review so
 * the user can adjust anything before generating (see page.tsx
 * `applyPreset`).
 */
export function PresetsGallery({ onSelect, onBack }: PresetsGalleryProps) {
  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <div>
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Presets</span>
        <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Elige un punto de partida</h1>
        <p className="mx-auto mt-3 max-w-xl text-zinc-400">
          Configuraciones completas y listas para revisar. Puedes ajustar cualquier respuesta antes de generar.
        </p>
      </div>

      <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CREATOR_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelect(preset)}
            className={glassCardInteractive('flex flex-col items-start gap-2 rounded-3xl p-6 text-left')}
          >
            <span className={glassPill('text-[10px] uppercase tracking-wide text-zinc-500')}>{preset.tagline}</span>
            <span className="text-lg font-medium text-white">{preset.name}</span>
            <p className="flex-1 text-sm leading-relaxed text-zinc-400">{preset.description}</p>
            <span className="mt-2 inline-flex items-center gap-1.5 text-xs text-zinc-500">
              Usar este preset
              <LuArrowRight className="h-3 w-3" aria-hidden="true" />
            </span>
          </button>
        ))}
      </div>

      <GlassIconButton onClick={onBack} label="Cambiar modo" />
    </div>
  );
}
