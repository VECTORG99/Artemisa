'use client';

import { glassPanel } from '@/lib/glass';
import { useTranslations } from '@/i18n';

interface StepContainerProps {
  children: React.ReactNode;
  /** 0-100. Omit to hide the progress bar (e.g. on the mode-select screen). */
  progress?: number;
  /** Small label above the progress bar, e.g. current section name. */
  progressLabel?: string;
  /** Right-aligned counter, e.g. "Paso 4 de 21". */
  stepLabel?: string;
  /** Reserves room for the page's fixed continue bar so content never hides
   * behind it while the panel scrolls. */
  withActionBar?: boolean;
  /** `wide` is used by Review and Completion, which show two columns. */
  size?: 'default' | 'wide';
  /** When true, the panel grows to fit its content instead of capping at
   * `max-h-[78vh]` and scrolling. Used by the mode-select screen, whose
   * content is meant to be seen in one glance (issue #604). */
  fill?: boolean;
}

/**
 * Shared wizard panel shell: liquid-glass panel with optional progress bar.
 * The background (SpaceSimulation) and navigation controls (back button)
 * live at the page level so they persist across mode changes without
 * remounting — this component only handles the glass card and its content.
 */
export function StepContainer({
  children,
  progress,
  progressLabel,
  stepLabel,
  withActionBar = false,
  size = 'default',
  fill = false,
}: StepContainerProps) {
  const common = useTranslations('common');
  const maxWidth = size === 'wide' ? 'max-w-6xl' : 'max-w-5xl';
  const heightClass = fill ? '' : 'creator-scroll max-h-[78vh] overflow-y-auto';

  return (
    <div className={`relative z-10 mx-auto flex w-full flex-col gap-4 ${maxWidth}`}>
      {progress !== undefined && (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            {progressLabel ? (
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{progressLabel}</span>
            ) : (
              <span />
            )}
            {stepLabel && <span className="shrink-0 text-[11px] tabular-nums text-zinc-500">{stepLabel}</span>}
          </div>
          <div
            className="h-1 overflow-hidden rounded-full bg-white/[0.05]"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={progressLabel ? common.progressWithLabel.replace('{label}', progressLabel) : common.progress}
          >
            <div
              className="h-full rounded-full bg-accent shadow-[0_0_10px_rgba(249,115,22,0.45)] transition-[width] duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <section className={glassPanel(`rounded-2xl p-6 sm:p-8 ${heightClass} ${withActionBar ? 'pb-20' : ''}`)}>
        {children}
      </section>
    </div>
  );
}
