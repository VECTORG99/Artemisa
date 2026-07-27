'use client';

import { useEffect } from 'react';
import Link from 'next/link';

import { StarfieldBackground } from '@/components/backgrounds/starfield-background';
import { glassPanel } from '@/lib/glass';
import { useTranslations } from '@/i18n';

/**
 * Global error boundary — catches runtime errors thrown by any route
 * segment and renders a branded, recoverable surface instead of Next.js'
 * default error page. `reset` re-renders the failed segment; if the error
 * persists the user can navigate back to a known-good route. See #453.
 */
interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  const t = useTranslations('errorPage');
  const common = useTranslations('common');

  useEffect(() => {
    // Frontend runtime errors are surfaced to the browser console so the
    // team can reproduce from devtools without a backend logger round-trip.
    // eslint-disable-next-line no-console
    console.error('[Artemisa] runtime error boundary:', error);
  }, [error]);

  return (
    <div className="allow-scroll relative min-h-screen overflow-y-auto bg-gradient-to-b from-zinc-950 via-black to-zinc-950 p-8 font-sans text-zinc-50">
      <StarfieldBackground />
      <main className="relative z-10 flex min-h-[80vh] flex-col items-center justify-center text-center">
        <div className={glassPanel('w-full max-w-lg rounded-2xl p-10 shadow-xl')}>
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-amber-400">{t.label}</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-50">{t.title}</h1>
          <p className="mt-4 text-sm text-zinc-400">{t.description}</p>
          {error.digest ? (
            <p className="mt-3 font-mono text-[11px] text-zinc-600">
              {t.digestLabel.replace('{digest}', error.digest)}
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-md border border-red-500/40 bg-red-500/10 px-5 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
            >
              {common.retry}
            </button>
            <Link
              href="/"
              className="rounded-md border border-white/[0.08] bg-white/[0.02] px-5 py-2.5 text-sm font-medium text-zinc-200 backdrop-blur-[9px] transition-colors hover:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
            >
              {common.backToHome}
            </Link>
            <Link
              href="/agents/new"
              className="rounded-md border border-white/[0.08] bg-white/[0.02] px-5 py-2.5 text-sm font-medium text-zinc-200 backdrop-blur-[9px] transition-colors hover:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
            >
              {common.openCreator}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
