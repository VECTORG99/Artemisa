/**
 * Liquid Glass styling system
 * Provides consistent glassy aesthetics across the application
 */

// Helper function to combine class names
export function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(' ');
}

// Base glass effect for large panels or containers
export function glassPanel(className?: string) {
  return cn(
    'bg-zinc-900/40 backdrop-blur-md',
    'border border-zinc-800/50',
    'shadow-[0_0_15px_rgba(0,0,0,0.5)]',
    className,
  );
}

// Cards
export function glassCard(className?: string) {
  return cn(
    'bg-zinc-900/40 backdrop-blur-md',
    'border border-zinc-800/50',
    'shadow-[0_0_15px_rgba(0,0,0,0.5)]',
    className,
  );
}

// Interactive cards with hover states
export function glassCardInteractive(className?: string) {
  return cn(
    glassCard(),
    'transition-all duration-300 ease-in-out',
    'hover:bg-zinc-800/50 hover:border-zinc-700/50',
    'cursor-pointer',
    className,
  );
}

// Form inputs
export function glassInput(className?: string) {
  return cn(
    'w-full rounded-xl',
    'bg-zinc-950/50 backdrop-blur-sm',
    'border border-zinc-800/80',
    'text-zinc-100 placeholder:text-zinc-500',
    'focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50',
    'transition-all duration-200',
    'px-4 py-3',
    className,
  );
}

// Buttons with standard glass look
export function glassButton(className?: string) {
  return cn(
    'px-4 py-2 rounded-lg',
    'bg-zinc-800/50 backdrop-blur-md',
    'border border-zinc-700/50',
    'text-zinc-100 font-medium',
    'transition-all duration-200',
    'hover:bg-zinc-700/60 hover:border-zinc-600/60',
    'active:scale-[0.98]',
    className,
  );
}

// Primary action button (with emerald accent)
export function glassPrimaryButton(className?: string) {
  return cn(
    'px-4 py-2 rounded-lg',
    'bg-emerald-950/40 backdrop-blur-md',
    'border border-emerald-900/50',
    'text-emerald-50 font-medium',
    'shadow-[0_0_15px_rgba(16,185,129,0.1)]',
    'transition-all duration-200',
    'hover:bg-emerald-900/60 hover:border-emerald-700/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]',
    'active:scale-[0.98]',
    className,
  );
}

// Pills for small labels
export function glassPill(className?: string) {
  return cn(
    'inline-flex items-center rounded-full px-2 py-0.5 font-medium border',
    'bg-zinc-800/30 border-zinc-700/50 backdrop-blur-sm',
    className,
  );
}
