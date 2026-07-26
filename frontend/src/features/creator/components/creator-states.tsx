'use client';

import { LuLoaderCircle, LuRotateCw, LuTriangleAlert } from 'react-icons/lu';
import { GlassBackButton } from '@/components/ui/glass-icon-button';
import { glassPanel, glassPrimaryButton } from '@/lib/glass';

/**
 * Shown while `/catalog`, `/workflow` and the initial `/evaluate` are in
 * flight (issue #438). Previously this state rendered nothing, so a cold
 * backend start looked like a broken page for 1-3 seconds.
 *
 * The skeleton mirrors the real wizard's geometry — progress bar, prompt,
 * option grid — so the layout does not jump when content arrives.
 */
export function CreatorLoading() {
  return (
    <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-6" role="status" aria-live="polite">
      <div className="flex flex-col gap-2">
        <span className="text-xs text-zinc-500">Cargando configuración…</span>
        <div className="h-1 overflow-hidden rounded-full bg-white/[0.05]">
          <div className="animate-progress-sweep h-full w-1/3 rounded-full bg-accent/70" />
        </div>
      </div>

      <section className={glassPanel('rounded-2xl p-6 sm:p-10')}>
        <div className="flex flex-col items-center gap-6">
          <LuLoaderCircle className="h-6 w-6 animate-spin text-zinc-500" aria-hidden="true" />
          <div className="flex w-full flex-col items-center gap-3">
            <div className="animate-skeleton h-3 w-24 rounded-full bg-white/[0.06]" />
            <div className="animate-skeleton h-6 w-2/3 rounded-full bg-white/[0.08]" />
            <div className="animate-skeleton h-3 w-1/2 rounded-full bg-white/[0.05]" />
          </div>
          <div className="grid w-full gap-2.5 sm:grid-cols-2">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className="animate-skeleton h-20 rounded-2xl border border-white/[0.06] bg-white/[0.02]"
                style={{ animationDelay: `${index * 120}ms` }}
              />
            ))}
          </div>
        </div>
      </section>
      <span className="sr-only">Cargando el catálogo y el árbol de decisiones del creador.</span>
    </div>
  );
}

interface CreatorFatalErrorProps {
  message: string;
  onRetry: () => void;
  retrying: boolean;
}

/**
 * Terminal state for a failed initial load. Before this existed the Creator
 * fell through to the mode selector with an unreachable backend, so the first
 * click failed instead of the page explaining the problem.
 */
export function CreatorFatalError({ message, onRetry, retrying }: CreatorFatalErrorProps) {
  return (
    <div className="relative z-10 mx-auto w-full max-w-xl">
      <section className={glassPanel('flex flex-col items-center gap-5 rounded-2xl p-8 text-center')} role="alert">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-accent-muted/60 bg-accent-deep/30">
          <LuTriangleAlert className="h-5 w-5 text-danger" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-xl font-semibold text-white">No se pudo cargar el creador</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
            El creador necesita el catálogo y el árbol de decisiones del backend antes de mostrar la primera pregunta.
          </p>
        </div>
        <p className="w-full break-words rounded-xl border border-white/[0.07] bg-black/30 px-4 py-3 text-left font-mono text-xs text-zinc-400">
          {message}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={onRetry} disabled={retrying} className={glassPrimaryButton('text-sm')}>
            <LuRotateCw className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} aria-hidden="true" />
            {retrying ? 'Reintentando…' : 'Reintentar'}
          </button>
          <GlassBackButton href="/" label="Volver al inicio" />
        </div>
      </section>
    </div>
  );
}
