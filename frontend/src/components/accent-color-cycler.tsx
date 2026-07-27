'use client';

import { useEffect } from 'react';

/**
 * Randomly assigns the brand accent (`--color-accent`) to one of the 7 RGB
 * rainbow colours. The colour stays fixed until the user hovers over a
 * **major interactive element** (a button or link):
 *
 * - On mount (page load / refresh): picks a random colour and holds it.
 * - On mouseenter of a button or link: picks a new random colour.
 * - Moving the mouse over form controls (inputs, checkboxes, radios,
 *   labels) does NOT change the colour — those are too dense in the
 *   Avanzado panel and would cause constant flickering.
 * - A 1s cooldown prevents rapid changes when swiping across multiple
 *   buttons in quick succession.
 *
 * Respects `prefers-reduced-motion`: picks one colour on mount and never
 * changes it.
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

/** Picks a random index that is different from `current` (equal probability). */
function nextIndex(current: number): number {
  if (RAINBOW.length <= 1) return 0;
  const next = Math.floor(Math.random() * (RAINBOW.length - 1));
  return next >= current ? next + 1 : next;
}

/** Only buttons and links — not option cards or form controls. */
const INTERACTIVE_SELECTOR = 'button, a, [role="button"]';

/** Minimum time between colour changes (ms). */
const COOLDOWN_MS = 1500;

export function AccentColorCycler() {
  useEffect(() => {
    const root = document.documentElement;
    let index = Math.floor(Math.random() * RAINBOW.length);
    root.style.setProperty('--color-accent', RAINBOW[index]);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    let lastChange = 0;
    let currentEl: Element | null = null;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target || !target.closest) return;
      const el = target.closest(INTERACTIVE_SELECTOR);
      if (!el) return;

      // Same element — no change.
      if (el === currentEl) return;

      // Nested: moving between a parent and child (e.g. button > span).
      if (currentEl && (currentEl.contains(el) || el.contains(currentEl))) {
        currentEl = el;
        return;
      }

      // Cooldown: don't change more than once per COOLDOWN_MS.
      const now = Date.now();
      if (now - lastChange < COOLDOWN_MS) {
        currentEl = el;
        return;
      }

      currentEl = el;
      lastChange = now;
      index = nextIndex(index);
      root.style.setProperty('--color-accent', RAINBOW[index]);
    };

    document.addEventListener('mouseover', handleMouseOver);
    return () => document.removeEventListener('mouseover', handleMouseOver);
  }, []);

  return null;
}
