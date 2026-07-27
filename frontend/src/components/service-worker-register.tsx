'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Registers the Artemisa Service Worker (#408) in production only. In
 * development the SW would cache stale assets and fight HMR, so it is
 * skipped entirely. The SW lives at /public/sw.js and is served as a
 * static asset at the site root.
 */
export function ServiceWorkerRegister() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    let mounted = true;
    const hadController = Boolean(navigator.serviceWorker.controller);

    const showUpdate = (worker: ServiceWorker) => {
      if (!mounted || !hadController) return;
      setWaitingWorker(worker);
    };

    const trackRegistration = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting) showUpdate(registration.waiting);

      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;

        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed') showUpdate(worker);
        });
      });
    };

    const handleControllerChange = () => {
      if (!refreshingRef.current) return;
      window.location.reload();
    };

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then(trackRegistration)
        .catch(() => {
          // SW registration failure is non-fatal: the app still works online.
        });
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });

    return () => {
      mounted = false;
      window.removeEventListener('load', register);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const reloadWithUpdate = () => {
    if (!waitingWorker) return;
    refreshingRef.current = true;
    setRefreshing(true);
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  };

  if (!waitingWorker) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-[90] max-w-sm rounded-2xl border border-white/10 bg-zinc-950/95 p-4 text-sm text-white shadow-2xl backdrop-blur-md"
    >
      <p className="font-medium">Hay una version nueva disponible.</p>
      <p className="mt-1 text-white/70">Recarga para usar la ultima build.</p>
      <button
        type="button"
        onClick={reloadWithUpdate}
        disabled={refreshing}
        className="mt-3 rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-white/90 disabled:cursor-wait disabled:opacity-70"
      >
        {refreshing ? 'Recargando...' : 'Recargar'}
      </button>
    </div>
  );
}
