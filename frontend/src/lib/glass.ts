/**
 * Liquid Glass styling system
 *
 * Mirrors the real landing page's glassStyle (see
 * frontend/src/features/landing/components/landing-modal.tsx): light blur,
 * near-transparent white background, subtle white border. Reads as glass
 * over the starfield/space scene, not a solid zinc panel. Every Creator
 * surface should use these helpers so the aesthetic matches the Landing
 * exactly (issue #390).
 *
 * Colour policy (issue #384): the glass base stays neutral white/zinc.
 * `--color-accent` (see styles/globals.css) is the only brand colour and is
 * reserved for selection, progress, primary CTAs and focus. Success is a
 * neutral white check, warnings are amber, failures use `danger`.
 */

// cn() lives in lib/utils.ts — imported here for internal use by glass helpers.
import { cn } from './utils';

/** Inline style object — identical to the landing's `glassStyle` constant. */
export const glassStyle: React.CSSProperties = {
  backdropFilter: 'blur(6px) saturate(140%)',
  WebkitBackdropFilter: 'blur(6px) saturate(140%)',
  background: 'rgba(255,255,255,0.012)',
  border: '1px solid rgba(255,255,255,0.07)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
};

// Base glass effect for large panels or containers
export function glassPanel(className?: string) {
  return cn(
    'backdrop-blur-[6px] backdrop-saturate-[1.4]',
    'bg-white/[0.012]',
    'border border-white/[0.07]',
    'shadow-[0_4px_24px_rgba(0,0,0,0.2)]',
    className,
  );
}

// Cards
export function glassCard(className?: string) {
  return cn(
    'backdrop-blur-[6px] backdrop-saturate-[1.4]',
    'bg-white/[0.012]',
    'border border-white/[0.07]',
    'shadow-[0_4px_24px_rgba(0,0,0,0.2)]',
    className,
  );
}

// Interactive cards with hover states
export function glassCardInteractive(className?: string) {
  return cn(
    glassCard(),
    'group transition-all duration-300 ease-in-out',
    'hover:bg-white/[0.035] hover:border-white/[0.12] hover:-translate-y-0.5',
    'cursor-pointer',
    className,
  );
}

// Form inputs
export function glassInput(className?: string) {
  return cn(
    'w-full rounded-xl',
    'bg-white/[0.012] backdrop-blur-sm',
    'border border-white/[0.07]',
    'text-zinc-100 placeholder:text-zinc-500',
    'focus:outline-none focus:ring-1 focus:ring-accent/60 focus:border-accent/50',
    'transition-all duration-200',
    'px-4 py-3',
    className,
  );
}

// Buttons — landing-style glass pill (rounded-full, not rounded-lg)
export function glassButton(className?: string) {
  return cn(
    'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full',
    'bg-white/[0.012] backdrop-blur-[6px] backdrop-saturate-[1.4]',
    'border border-white/[0.07]',
    'text-white/85 font-medium',
    'shadow-[0_4px_24px_rgba(0,0,0,0.2)]',
    'transition-colors duration-200',
    'hover:text-white hover:bg-white/[0.035]',
    'active:scale-[0.98]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
    className,
  );
}

/**
 * Primary action button. Carries the brand accent as a border + glow rather
 * than a solid fill, so it stays legible over the moving starfield and does
 * not read as an error banner.
 */
export function glassPrimaryButton(className?: string) {
  return cn(
    'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full',
    'bg-accent-deep/25 backdrop-blur-[6px] backdrop-saturate-[1.4]',
    'border border-accent/50',
    'text-white font-medium',
    'shadow-[0_4px_24px_rgba(0,0,0,0.25)]',
    'transition-colors duration-200',
    'hover:bg-accent-deep/45 hover:border-accent',
    'active:scale-[0.98]',
    'disabled:cursor-not-allowed disabled:border-white/[0.07] disabled:bg-white/[0.02] disabled:text-zinc-600 disabled:hover:bg-white/[0.02]',
    className,
  );
}

// Pills for small labels/tags — landing tech-stack chip style
export function glassPill(className?: string) {
  return cn(
    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs',
    'bg-white/[0.02] backdrop-blur-md border border-white/[0.07]',
    'text-zinc-300',
    className,
  );
}

/**
 * Option card (a choice in a select/multiselect/catalog grid).
 *
 * The three states are visually distinct without relying on colour alone:
 * selected adds the accent border plus a check icon at the call site,
 * blocked drops opacity and the pointer, default is plain glass.
 */
export function glassOptionCard(selected: boolean, blocked = false, className?: string) {
  const base = 'flex flex-col gap-1 rounded-2xl border p-3.5 text-left transition-colors';
  if (blocked) return cn(base, 'cursor-not-allowed border-white/[0.05] bg-white/[0.01] opacity-40', className);
  if (selected)
    return cn(base, 'border-accent/60 bg-accent-deep/20 shadow-[0_0_0_1px_rgba(34,197,94,0.15)]', className);
  return cn(base, 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.16] hover:bg-white/[0.04]', className);
}

/** Selectable filter chip (browser facets, section tabs). */
export function glassFilterChip(active: boolean, className?: string) {
  return glassPill(
    cn(
      'cursor-pointer transition-colors',
      active ? 'border-accent/60 bg-accent-deep/30 text-white' : 'hover:border-white/20 hover:text-white',
      className,
    ),
  );
}

/** Inline notice surfaces. `danger` is filled so it never reads as selected. */
export function glassNotice(tone: 'danger' | 'warn' | 'neutral', className?: string) {
  const base = 'flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm';
  if (tone === 'danger') return cn(base, 'border-accent-muted/60 bg-accent-deep/30 text-danger', className);
  if (tone === 'warn') return cn(base, 'border-warn/30 bg-warn/[0.06] text-amber-100', className);
  return cn(base, 'border-white/[0.07] bg-white/[0.02] text-zinc-300', className);
}
