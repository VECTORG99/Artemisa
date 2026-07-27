'use client';

import { useEffect } from 'react';

/**
 * Randomly assigns the brand accent (`--color-accent`) to one of the 7 RGB
 * rainbow colours. The colour stays fixed until the mouse **enters** a
 * button or link — not while moving within it:
 *
 * - On mount (page load / refresh): picks a random colour and holds it.
 * - When the mouse enters a `<button>` or `<a>`: picks a new random colour.
 * - Moving the mouse *within* the same button (over its child spans/icons):
 *   does NOT change — detected via `relatedTarget`.
 * - Leaving a button and re-entering the same one: changes (new entry).
 * - Form controls (inputs, checkboxes, labels, option cards) do NOT
 *   trigger a change.
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

export function AccentColorCycler() {
  useEffect(() => {
    const root = document.documentElement;
    let index = Math.floor(Math.random() * RAINBOW.length);
    root.style.setProperty('--color-accent', RAINBOW[index]);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target || !target.closest) return;
      const el = target.closest(INTERACTIVE_SELECTOR);
      if (!el) return;

      // `relatedTarget` is the element the mouse came from. If it's inside
      // the same interactive element, the mouse is moving *within* it (over
      // child spans, svgs, etc.) — not a new entry. Skip.
      const related = e.relatedTarget as Element | null;
      if (related && (related === el || el.contains(related))) return;

      // Genuine entry (or re-entry) into a button/link → change colour.
      index = nextIndex(index);
      root.style.setProperty('--color-accent', RAINBOW[index]);
    };

    document.addEventListener('mouseover', handleMouseOver);
    return () => document.removeEventListener('mouseover', handleMouseOver);
  }, []);

  return null;
}
