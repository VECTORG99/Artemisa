'use client';

import Link from 'next/link';
import { StarfieldBackground } from '@/components/backgrounds/starfield-background';
import { glassPanel } from '@/lib/glass';

interface StepContainerProps {
  children: React.ReactNode;
  /** 0-100. Omit to hide the progress bar (e.g. on the mode-select screen). */
  progress?: number;
  /** Small label above the progress bar, e.g. current section name. */
  progressLabel?: string;
}

/**
 * Shared wizard shell: low-profile starfield background, liquid-glass main
 * panel, and an optional progress bar. Every Creator screen (mode select,
 * questions, review, completion) renders inside this.
 */
export function StepContainer({ children, progress, progressLabel }: StepContainerProps) {
  return (
    <main className="allow-scroll relative min-h-screen px-4 py-10 text-zinc-50 sm:px-8">
      <StarfieldBackground />
      <div className="relative z-10 mx-auto flex max-w-4xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">
            ← Volver al inicio
          </Link>
          <span className="text-xs uppercase tracking-wide text-zinc-600">Huascar Creator</span>
        </header>

        {progress !== undefined && (
          <div className="flex flex-col gap-2">
            {progressLabel && <span className="text-xs text-zinc-500">{progressLabel}</span>}
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <section className={glassPanel('rounded-2xl p-6 sm:p-10')}>{children}</section>
      </div>
    </main>
  );
}
