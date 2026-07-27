'use client';

import { useEffect } from 'react';

/**
 * Randomly assigns the brand accent (`--color-accent`) to one of the 7 RGB
 * rainbow colours. The colour stays fixed until the user hovers over a
 * **different** interactive element:
 *
 * - On mount (page load / refresh): picks a random colour and holds it.
 * - On mouseenter of an interactive element: picks a new random colour.
 * - While the mouse stays within the same element (or moves between a
 *   parent and its children): the colour does NOT change.
 * - On mouseleave: the colour does NOT change — it holds until the next
 *   mouseenter on a different element.
 *
 * This prevents the rapid flickering that happened with `mouseover` (which
 * bubbles and fires on every child element transition). `mouseenter` does
 * not bubble and fires exactly once per element entry, so nested
 * interactive elements (a checkbox inside a label, a span inside a button)
 * don't trigger repeated colour changes.
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

    const applyColour = () => {
      index = nextIndex(index);
      root.style.setProperty('--color-accent', RAINBOW[index]);
    };

    // `mouseover` fires on every element transition (bubbles), but we only
    // want to change the colour when the mouse enters a *different* top-level
    // interactive element — not when moving between a parent and its child
    // (e.g. a label and the checkbox inside it). We track the outermost
    // interactive ancestor and skip if the new one contains or is contained
    // by the previous one.
    let currentEl: Element | null = null;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target || !target.closest) return;
      const el = target.closest(INTERACTIVE_SELECTOR);
      if (!el) return;

      // Same element — no change.
      if (el === currentEl) return;

      // Nested: moving between a parent interactive and its child interactive
      // (e.g. label → checkbox inside it). Don't change the colour.
      if (currentEl && (currentEl.contains(el) || el.contains(currentEl))) {
        currentEl = el;
        return;
      }

      currentEl = el;
      applyColour();
    };

    document.addEventListener('mouseover', handleMouseOver);
    return () => document.removeEventListener('mouseover', handleMouseOver);
  }, []);

  return null;
}
