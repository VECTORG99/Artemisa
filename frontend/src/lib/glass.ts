/**
 * Liquid Glass styling system
 *
 * Mirrors the real landing page's glassStyle (see
 * frontend/src/features/landing/components/landing-modal.tsx): light blur,
 * near-transparent white background, subtle white border. Reads as glass
 * over the starfield/space scene, not a solid zinc panel. Every Creator
 * surface should use these helpers so the aesthetic matches the Landing
 * exactly (issue #390).
 */

// Helper function to combine class names
export function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(' ');
}

/** Inline style object — identical to the landing's `glassStyle` constant. */
export const glassStyle: React.CSSProperties = {
  backdropFilter: 'blur(9px) saturate(140%)',
  WebkitBackdropFilter: 'blur(9px) saturate(140%)',
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
};

// Base glass effect for large panels or containers
export function glassPanel(className?: string) {
  return cn(
    'backdrop-blur-[9px] backdrop-saturate-[1.4]',
    'bg-white/[0.02]',
    'border border-white/[0.08]',
    'shadow-[0_4px_24px_rgba(0,0,0,0.25)]',
    className,
  );
}

// Cards
export function glassCard(className?: string) {
  return cn(
    'backdrop-blur-[9px] backdrop-saturate-[1.4]',
    'bg-white/[0.02]',
    'border border-white/[0.08]',
    'shadow-[0_4px_24px_rgba(0,0,0,0.25)]',
    className,
  );
}

// Interactive cards with hover states
export function glassCardInteractive(className?: string) {
  return cn(
    glassCard(),
    'transition-all duration-300 ease-in-out',
    'hover:bg-white/[0.05] hover:border-white/[0.15] hover:-translate-y-0.5',
    'cursor-pointer',
    className,
  );
}

// Form inputs
export function glassInput(className?: string) {
  return cn(
    'w-full rounded-xl',
    'bg-white/[0.02] backdrop-blur-sm',
    'border border-white/[0.08]',
    'text-zinc-100 placeholder:text-zinc-500',
    'focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30',
    'transition-all duration-200',
    'px-4 py-3',
    className,
  );
}

// Buttons — landing-style glass pill (rounded-full, not rounded-lg)
export function glassButton(className?: string) {
  return cn(
    'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full',
    'bg-white/[0.02] backdrop-blur-[9px] backdrop-saturate-[1.4]',
    'border border-white/[0.08]',
    'text-white/85 font-medium',
    'shadow-[0_4px_24px_rgba(0,0,0,0.25)]',
    'transition-colors duration-200',
    'hover:text-white hover:bg-white/[0.05]',
    'active:scale-[0.98]',
    className,
  );
}

// Primary action button — same glass pill, brighter border, no color accent
// (the landing has no emerald/color accents on buttons — everything is
// neutral white-on-glass).
export function glassPrimaryButton(className?: string) {
  return cn(
    'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full',
    'bg-white/[0.03] backdrop-blur-[9px] backdrop-saturate-[1.4]',
    'border border-white/[0.12]',
    'text-white font-medium',
    'shadow-[0_4px_24px_rgba(0,0,0,0.3)]',
    'transition-colors duration-200',
    'hover:bg-white/[0.08] hover:border-white/20',
    'active:scale-[0.98]',
    className,
  );
}

// Pills for small labels/tags — landing tech-stack chip style
export function glassPill(className?: string) {
  return cn(
    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs',
    'bg-white/[0.03] backdrop-blur-md border border-white/[0.08]',
    'text-zinc-300',
    className,
  );
}
