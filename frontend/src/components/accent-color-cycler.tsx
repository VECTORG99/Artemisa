'use client';

import { useEffect } from 'react';

/**
 * Randomly cycles the brand accent (`--color-accent`) through the RGB
 * rainbow, reassigning it every couple of seconds so the app's accent
 * colour is never static. The derived shades (`--color-accent-hover`,
 * `--color-accent-active`, `--color-accent-muted`, `--color-accent-deep`)
 * are derived from `--color-accent` via `color-mix` in globals.css, so
 * updating the single base variable updates every accent utility at once.
 *
 * A CSS `@property` registration + transition on `:root` makes each hop
 * fade smoothly into the next instead of snapping. Respects
 * `prefers-reduced-motion`: in that case the colour is picked once and
 * stays put.
 */
const RAINBOW = [
  'rgb(239,68,68)', // red
  'rgb(249,115,22)', // orange
  'rgb(234,179,8)', // yellow
  'rgb(34,197,94)', // green
  'rgb(59,130,246)', // blue
  'rgb(139,92,246)', // violet
  'rgb(236,72,153)', // pink
] as const;

const INTERVAL_MS = 2500;

/** Picks a random index that is different from `current` (equal probability). */
function nextIndex(current: number): number {
  if (RAINBOW.length <= 1) return 0;
  const next = Math.floor(Math.random() * (RAINBOW.length - 1));
  return next >= current ? next + 1 : next;
}

export function AccentColorCycler() {
  useEffect(() => {
    const root = document.documentElement;
    let index = Math.floor(Math.random() * RAINBOW.length);
    root.style.setProperty('--color-accent', RAINBOW[index]);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const timer = window.setInterval(() => {
      index = nextIndex(index);
      root.style.setProperty('--color-accent', RAINBOW[index]);
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  return null;
}
