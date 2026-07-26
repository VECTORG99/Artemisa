export function cn(...inputs) {
  return inputs.filter(Boolean).join(' ');
}

export function glassPanel(className) {
  return cn(
    'bg-zinc-900/40 backdrop-blur-md',
    'border border-zinc-800/50',
    'shadow-[0_0_15px_rgba(0,0,0,0.5)]',
    className,
  );
}

export function glassCard(className) {
  return cn(
    'bg-zinc-900/40 backdrop-blur-md',
    'border border-zinc-800/50',
    'shadow-[0_0_15px_rgba(0,0,0,0.5)]',
    className,
  );
}

export function glassCardInteractive(className) {
  return cn(
    glassCard(),
    'transition-all duration-300 ease-in-out',
    'hover:bg-zinc-800/50 hover:border-zinc-700/50',
    'cursor-pointer',
    className,
  );
}

export function glassInput(className) {
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

export function glassButton(className) {
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

export function glassPrimaryButton(className) {
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

export function glassPill(className) {
  return cn(
    'inline-flex items-center rounded-full px-2 py-0.5 font-medium border',
    'bg-zinc-800/30 border-zinc-700/50 backdrop-blur-sm',
    className,
  );
}
