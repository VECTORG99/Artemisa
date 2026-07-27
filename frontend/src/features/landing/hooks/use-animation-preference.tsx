'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'artemisa:animations-enabled';

interface AnimationPreferenceContextValue {
  animationsEnabled: boolean;
  toggle: () => void;
  hydrated: boolean;
}

const AnimationPreferenceContext = createContext<AnimationPreferenceContextValue>({
  animationsEnabled: true,
  toggle: () => {},
  hydrated: false,
});

export function useAnimationPreference() {
  return useContext(AnimationPreferenceContext);
}

/**
 * Provides the animation preference to all children so the toggle button
 * and the SpaceSimulation component share the same state.
 *
 * - Default: animations ON (unless prefers-reduced-motion).
 * - Persisted to localStorage.
 */
export function AnimationPreferenceProvider({ children }: { children: ReactNode }) {
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setAnimationsEnabled(stored === 'true');
        return;
      }
    } catch {
      // localStorage may be unavailable
    }

    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setAnimationsEnabled(false);
    }
  }, []);

  const toggle = useCallback(() => {
    setAnimationsEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return (
    <AnimationPreferenceContext.Provider value={{ animationsEnabled, toggle, hydrated }}>
      {children}
    </AnimationPreferenceContext.Provider>
  );
}
