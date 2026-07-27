'use client';

import { LuCompass, LuGauge, LuLayoutGrid, LuSlidersHorizontal } from 'react-icons/lu';
import { glassCardInteractive, glassPill } from '@/lib/glass';
import { apiUrl } from '@/lib/api';
import { QuickStartCopy } from '@/components/ui/quick-start-copy';
import { TechIcon } from '@/features/creator/lib/tech-icons';

/**
 * The 7 agent-platform targets the backend can generate for
 * (src/creator/catalog.ts, category 'agent-platform'). Listed up front so the
 * user discovers the multi-platform scope without opening the full catalog —
 * the Creator is positioned as a config-file generator, not a Kiro-only tool
 * (issue #604). Kept in sync with the catalog by id; labels mirror the catalog
 * `item.label` so the chips match the option cards.
 *
 * Each chip carries a solid RGB color so the row reads as a left-to-right
 * rainbow — no blend modes, just opaque backgrounds with white text/icons on
 * top for contrast.
 */
const SUPPORTED_PLATFORMS: { id: string; label: string; color: string }[] = [
  { id: 'agents-md', label: 'AGENTS.md', color: 'rgb(239,68,68)' }, // red
  { id: 'cursor', label: 'Cursor', color: 'rgb(249,115,22)' }, // orange
  { id: 'devin-desktop', label: 'Devin / Windsurf', color: 'rgb(234,179,8)' }, // yellow
  { id: 'coderabbit', label: 'CodeRabbit', color: 'rgb(34,197,94)' }, // green
  { id: 'kilo-code', label: 'Kilo Code', color: 'rgb(59,130,246)' }, // blue
  { id: 'kiro', label: 'Kiro', color: 'rgb(139,92,246)' }, // violet
  { id: 'portable', label: 'Portable', color: 'rgb(236,72,153)' }, // pink
];

const STARTUP_URL = `${apiUrl}/api/v1/creator/startup`;

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
    <div className="flex flex-col items-center gap-6 text-center">
      <div>
        <h1 className="text-3xl font-semibold text-white sm:text-4xl">¿Cómo quieres configurar tu agente?</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
          Los cuatro modos generan el mismo tipo de bundle y terminan en la misma revisión. Puedes cambiar de modo en
          cualquier momento sin perder lo que ya respondiste.
        </p>
      </div>

      <div className="flex flex-col items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Genera configuración para</span>
        <ul className="flex flex-wrap items-center justify-center gap-1.5">
          {SUPPORTED_PLATFORMS.map((platform) => (
            <li key={platform.id}>
              <span className={glassPill('inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium')}>
                <TechIcon
                  id={platform.id}
                  category="agent-platform"
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: platform.color }}
                />
                <span style={{ color: platform.color }}>{platform.label}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="w-full max-w-3xl space-y-6">
        <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => onSelect(mode.id)}
              className={glassCardInteractive(
                'flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl p-3 text-center hover:border-accent/40',
              )}
            >
              <mode.Icon
                className="h-6 w-6 text-zinc-400 transition-colors group-hover:text-accent"
                aria-hidden="true"
              />
              <span className="text-sm font-medium text-white">{mode.label}</span>
              <p className="text-[11px] leading-tight text-zinc-400">{mode.description}</p>
              <span className={glassPill('mt-0.5 py-0.5 text-[10px] text-zinc-400')}>{mode.tagline}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-sm text-zinc-500">o pega un prompt en tu chat de IA</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <QuickStartCopy url={STARTUP_URL} size="lg" />
      </div>
    </div>
  );
}
