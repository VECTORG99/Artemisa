'use client';

import Link from 'next/link';
import { LuArrowLeft } from 'react-icons/lu';
import { glassStyle } from '@/lib/glass';

const CIRCLE_CLASSES =
  'inline-flex h-11 w-11 items-center justify-center rounded-full text-zinc-300 shadow-[0_4px_24px_rgba(0,0,0,0.25)] transition-colors duration-200 hover:text-white hover:bg-white/[0.06] active:scale-[0.96]';

interface GlassIconButtonProps {
  onClick?: () => void;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}

/**
 * Circular liquid-glass icon button — same blur/border treatment as the
 * Landing's floating nav (see sticky-nav.tsx `glassStyle`), used for
 * back/navigation actions across the Creator instead of plain text links.
 */
export function GlassIconButton({ onClick, label, icon: Icon = LuArrowLeft, className }: GlassIconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      style={glassStyle}
      className={`${CIRCLE_CLASSES} ${className ?? ''}`}
    >
      <Icon className="h-4.5 w-4.5" aria-hidden="true" />
    </button>
  );
}

interface GlassBackButtonProps {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}

/** Same circular glass button as a navigational `<Link>` (e.g. "volver al inicio"). */
export function GlassBackButton({ href, label, icon: Icon = LuArrowLeft, className }: GlassBackButtonProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      style={glassStyle}
      className={`${CIRCLE_CLASSES} ${className ?? ''}`}
    >
      <Icon className="h-4.5 w-4.5" aria-hidden="true" />
    </Link>
  );
}
