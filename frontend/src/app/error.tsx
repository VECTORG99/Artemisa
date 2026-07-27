'use client';

import { useEffect } from 'react';
import Link from 'next/link';

import { StarfieldBackground } from '@/components/backgrounds/starfield-background';
import { glassPanel } from '@/lib/glass';

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
  useEffect(() => {
    // Frontend runtime errors are surfaced to the browser console so the
    // team can reproduce from devtools without a backend logger round-trip.
    // eslint-disable-next-line no-console
    console.error('[Huascar] runtime error boundary:', error);
  }, [error]);

  return (
    <div className="allow-scroll relative min-h-screen overflow-y-auto bg-gradient-to-b from-zinc-950 via-black to-zinc-950 p-8 font-sans text-zinc-50">
      <StarfieldBackground />
      <main className="relative z-10 flex min-h-[80vh] flex-col items-center justify-center text-center">
        <div className={glassPanel('w-full max-w-lg rounded-2xl p-10 shadow-xl')}>
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-amber-400">Error inesperado</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-50">Algo salió mal</h1>
          <p className="mt-4 text-sm text-zinc-400">
            Ocurrió un error mientras se renderizaba esta pantalla. Puedes reintentar o volver a una ruta conocida.
          </p>
          {error.digest ? <p className="mt-3 font-mono text-[11px] text-zinc-600">digest: {error.digest}</p> : null}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-md border border-accent/40 bg-accent/10 px-5 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent/20 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-zinc-950"
            >
              Reintentar
            </button>
            <Link
              href="/"
              className="rounded-md border border-white/[0.08] bg-white/[0.02] px-5 py-2.5 text-sm font-medium text-zinc-200 backdrop-blur-[9px] transition-colors hover:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-zinc-950"
            >
              Volver al inicio
            </Link>
            <Link
              href="/agents/new"
              className="rounded-md border border-white/[0.08] bg-white/[0.02] px-5 py-2.5 text-sm font-medium text-zinc-200 backdrop-blur-[9px] transition-colors hover:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-zinc-950"
            >
              Abrir el Creador
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
