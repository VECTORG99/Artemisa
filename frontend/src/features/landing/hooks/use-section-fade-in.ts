'use client';

import { useEffect, useRef } from 'react';

/**
 * Adds the `is-visible` class to the element when it enters the viewport
 * (via IntersectionObserver), triggering the CSS fade-in transition
 * defined by `.section-content` in globals.css.
 *
 * Used by landing sections to get a subtle parallax fade-in as the user
 * scrolls between snap sections (issue #388).
 */
export function useSectionFadeIn<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-visible');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}
