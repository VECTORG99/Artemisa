import Link from 'next/link';

import { StarfieldBackground } from '@/components/backgrounds/starfield-background';
import { glassPanel } from '@/lib/glass';

/**
 * Branded 404 page — replaces Next.js' default "This page could not be
 * found" with a glass surface over the space scene and navigation back to
 * the product (landing + Creator). See issue #453.
 */
export default function NotFound() {
  return (
    <div className="allow-scroll relative min-h-screen overflow-y-auto bg-gradient-to-b from-zinc-950 via-black to-zinc-950 p-8 font-sans text-zinc-50">
      <StarfieldBackground />
      <main className="relative z-10 flex min-h-[80vh] flex-col items-center justify-center text-center">
        <div className={glassPanel('w-full max-w-lg rounded-2xl p-10 shadow-xl')}>
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-red-400">Error 404</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-50">Página no encontrada</h1>
          <p className="mt-4 text-sm text-zinc-400">
            La ruta que buscas no existe o fue movida. Huascar genera archivos de configuración, no aloja agentes;
            algunas rutas anteriores pudieron desaparecer.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="rounded-md border border-white/[0.08] bg-white/[0.02] px-5 py-2.5 text-sm font-medium text-zinc-200 backdrop-blur-[9px] transition-colors hover:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
            >
              Volver al inicio
            </Link>
            <Link
              href="/agents/new"
              className="rounded-md border border-red-500/40 bg-red-500/10 px-5 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
            >
              Abrir el Creador
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
