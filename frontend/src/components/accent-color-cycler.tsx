'use client';

import { useEffect } from 'react';

/**
 * Randomly assigns the brand accent (`--color-accent`) to one of the 7 RGB
 * rainbow colours. The colour is **not** on a timer — it stays fixed until
 * the user interacts with the page again:
 *
 * - On mount (page load / refresh): picks a random colour.
 * - On hover over any interactive element (button, link, option card,
 *   input, label): picks a new random colour.
 *
 * This makes the accent feel alive and playful without being distracting:
 * the colour only changes when the user does something, and holds steady
 * the rest of the time. Derived shades follow automatically via `color-mix`
 * in globals.css.
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

const INTERACTIVE_SELECTOR =
  'button, a, [role="button"], [role="checkbox"], [role="radio"], .glassCardInteractive, input, label, select, textarea';

export function AccentColorCycler() {
  useEffect(() => {
    const root = document.documentElement;
    let index = Math.floor(Math.random() * RAINBOW.length);
    root.style.setProperty('--color-accent', RAINBOW[index]);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    // Track which interactive element the mouse is currently inside so we
    // only pick a new colour when entering a *different* interactive element,
    // not on every pixel of mouse movement within the same one.
    let currentElement: Element | null = null;

    const handleMouseOver = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target || !target.closest) return;
      const interactive = target.closest(INTERACTIVE_SELECTOR);
      if (interactive === currentElement) return;
      currentElement = interactive;
      if (interactive) {
        index = nextIndex(index);
        root.style.setProperty('--color-accent', RAINBOW[index]);
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    return () => document.removeEventListener('mouseover', handleMouseOver);
  }, []);

  return null;
}
