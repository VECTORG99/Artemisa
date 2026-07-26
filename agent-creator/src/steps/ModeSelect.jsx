import StarfieldBackground from '../components/StarfieldBackground';
import { glassCardInteractive, glassPanel } from '../utils/glass';

export default function ModeSelect({ onSelect }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 py-10 text-zinc-100">
      <StarfieldBackground />

      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-emerald-400 sm:text-4xl">¿Cómo quieres crear tu agente?</h1>
          <p className="mt-3 text-zinc-400">Elige el modo que mejor se adapte a tu experiencia y preferencia.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <button
            onClick={() => onSelect('automated')}
            className={`${glassCardInteractive('rounded-2xl p-8 text-left')} group`}
          >
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-950/60 text-2xl">
              🧭
            </div>
            <h2 className="text-xl font-bold text-zinc-100 group-hover:text-emerald-300 transition-colors">
              Automatizado
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Un asistente guiado te lleva paso a paso por las decisiones. Ideal si es tu primera vez o prefieres un
              flujo estructurado.
            </p>
            <div
              className={`mt-5 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${glassPanel('border-emerald-900/50 text-emerald-400')}`}
            >
              Recomendado para principiantes
            </div>
          </button>

          <button
            onClick={() => onSelect('fine-tuning')}
            className={`${glassCardInteractive('rounded-2xl p-8 text-left')} group`}
          >
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-violet-950/60 text-2xl">
              ⚙️
            </div>
            <h2 className="text-xl font-bold text-zinc-100 group-hover:text-violet-300 transition-colors">
              Fine-tuning
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Dashboard multi-panel donde configuras todo simultáneamente. Skills, MCPs, personalidad y targets en una
              sola vista.
            </p>
            <div
              className={`mt-5 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${glassPanel('border-violet-900/50 text-violet-400')}`}
            >
              Para usuarios avanzados
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
