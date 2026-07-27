'use client';

import { LuSparkles, LuMoon } from 'react-icons/lu';
import { glassStyle } from './landing-modal';
import { useAnimationPreference } from '../hooks/use-animation-preference';
import { useTranslations } from '@/i18n';

/**
 * Floating toggle (bottom-left) that lets the user disable the space
 * simulation animations (black hole + meteors + stars). State is
 * persisted via useAnimationPreference and shared with the Creator.
 */
export function AnimationToggle() {
  const { animationsEnabled, toggle, hydrated } = useAnimationPreference();
  const t = useTranslations('landing');

  // Avoid hydration mismatch — render a stable placeholder until mounted.
  if (!hydrated) {
    return <div className="fixed bottom-5 left-5 z-50 h-10 rounded-full opacity-0" aria-hidden="true" />;
  }

  const Icon = animationsEnabled ? LuSparkles : LuMoon;
  const label = animationsEnabled ? t.disableAnimations : t.enableAnimations;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={!animationsEnabled}
      aria-label={label}
      className="pointer-events-auto fixed bottom-5 left-5 z-50 flex items-center gap-2 rounded-full px-3 py-2 text-xs text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      style={glassStyle}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
