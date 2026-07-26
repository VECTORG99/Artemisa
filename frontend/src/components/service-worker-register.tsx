'use client';

import { useEffect } from 'react';

/**
 * Registers the Huascar Service Worker (#408) in production only. In
 * development the SW would cache stale assets and fight HMR, so it is
 * skipped entirely. The SW lives at /public/sw.js and is served as a
 * static asset at the site root.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW registration failure is non-fatal: the app still works online.
      });
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);
  return null;
}
