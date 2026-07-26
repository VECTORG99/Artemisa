'use client';

import { glassInput, glassPill } from '@/lib/glass';

export interface ModelTuningState {
  provider: string;
  temperature: number;
}

const PROVIDERS = [
  { id: 'openai', label: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'local', label: 'Local / NIM / OpenRouter (OpenAI-compatible)' },
];

interface ModelTuningPanelProps {
  value: ModelTuningState;
  onChange: (next: ModelTuningState) => void;
}

/**
 * Ultra-technical model knobs (provider, temperature) for fine-tuning mode's
 * "Avanzado" panel. NOTE: the backend Creator's decision tree has no question
 * for these yet — src/engine/LlmProvider.ts resolves the provider chain from
 * server-side env vars (LLM_PROVIDER_CHAIN, LOCAL_MODEL, ...), not from a
 * per-agent answer. This panel is intentionally previewed as "not yet wired
 * to the bundle" rather than silently pretending to apply a setting the
 * generator can't act on.
 */
export function ModelTuningPanel({ value, onChange }: ModelTuningPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className={glassPill('w-fit text-[11px] text-amber-300')}>
        Vista previa — estos parámetros aún no se aplican al bundle generado
      </p>

      <div className="flex flex-col gap-2">
        <span className="text-xs text-zinc-500">Proveedor de modelo preferido</span>
        <div className="flex flex-wrap gap-2">
          {PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              type="button"
              onClick={() => onChange({ ...value, provider: provider.id })}
              className={glassPill(
                `cursor-pointer transition-colors ${value.provider === provider.id ? 'border-white/30 bg-white/[0.1] text-white' : 'hover:border-white/20'}`,
              )}
            >
              {provider.label}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-xs text-zinc-500">Temperature ({value.temperature.toFixed(1)})</span>
        <input
          type="range"
          min={0}
          max={2}
          step={0.1}
          value={value.temperature}
          onChange={(event) => onChange({ ...value, temperature: Number(event.target.value) })}
          className={glassInput('h-auto cursor-pointer accent-white')}
        />
      </label>
    </div>
  );
}
