'use client';

import dynamic from 'next/dynamic';
import { GlassBackButton } from '@/components/ui/glass-icon-button';
import { glassPanel } from '@/lib/glass';

const SpaceSimulation = dynamic(
  () => import('@/features/landing/components/space-simulation').then((m) => m.SpaceSimulation),
  { ssr: false },
);

interface StepContainerProps {
  children: React.ReactNode;
  /** 0-100. Omit to hide the progress bar (e.g. on the mode-select screen). */
  progress?: number;
  /** Small label above the progress bar, e.g. current section name. */
  progressLabel?: string;
}

/**
 * Shared wizard shell: the exact same star field, gravitational lensing and
 * meteor physics as the Landing's SpaceSimulation, with the black hole
 * itself turned off (`showBlackHole={false}`) — a decorative black hole
 * doesn't belong in a configuration tool, but the rest of the scene should
 * match Landing exactly. Liquid-glass main panel plus an optional progress
 * bar. Every Creator screen (mode select, questions, review, completion)
 * renders inside this, always centered in the viewport — the panel scrolls
 * internally if its content overflows instead of growing the page.
 */
export function StepContainer({ children, progress, progressLabel }: StepContainerProps) {
  return (
    <main className="relative flex h-screen flex-col items-center justify-center overflow-hidden px-4 py-6 text-zinc-50 sm:px-8">
      <SpaceSimulation showBlackHole={false} />

      <div className="absolute left-4 top-6 z-20 sm:left-8">
        <GlassBackButton href="/" label="Volver al inicio" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-6">
        {progress !== undefined && (
          <div className="flex flex-col gap-2">
            {progressLabel && <span className="text-xs text-zinc-500">{progressLabel}</span>}
            <div className="h-1 overflow-hidden rounded-full bg-white/[0.05]">
              <div
                className="h-full rounded-full bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <section className={glassPanel('max-h-[80vh] overflow-y-auto rounded-2xl p-6 sm:p-10')}>{children}</section>
      </div>
    </main>
  );
}
