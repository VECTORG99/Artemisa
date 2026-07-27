'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { LuRocket, LuFlaskConical, LuLayers, LuScale, LuGithub } from 'react-icons/lu';
import type { IconType } from 'react-icons';
import { glassStyle, useLandingModal, type LandingModalId } from './landing-modal';

const REVEAL_ZONE_PX = 56;
const HIDE_DELAY_MS = 1400;

/**
 * Floating, pill-shaped header — visible by default at reduced opacity so
 * navigation is always discoverable, and reaches full opacity when the
 * cursor approaches the top edge of the viewport or hovers the nav itself.
 */
export function StickyHeader() {
  const [emphasized, setEmphasized] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { open } = useLandingModal();

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (e.clientY < REVEAL_ZONE_PX) {
        setEmphasized(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      } else if (emphasized) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setEmphasized(false), HIDE_DELAY_MS);
      }
    },
    [emphasized],
  );

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [handleMouseMove]);

  return (
    <header
      className={`fixed inset-x-0 top-3 z-50 flex justify-center px-4 transition-opacity duration-500 ${
        emphasized ? 'opacity-100' : 'opacity-60 hover:opacity-100 focus-within:opacity-100'
      }`}
    >
      <nav
        className="pointer-events-auto flex w-full max-w-3xl flex-wrap items-center justify-center gap-5 rounded-full px-6 py-3 text-center text-xs font-medium text-zinc-400 shadow-[0_8px_32px_rgba(0,0,0,0.35)] sm:py-2.5"
        style={glassStyle}
        aria-label="Navegación principal"
        onMouseEnter={() => setEmphasized(true)}
        onMouseLeave={() => setEmphasized(false)}
      >
        <Link href="/agents/new" className="flex items-center gap-1.5 transition-colors hover:text-white">
          <LuRocket className="h-3.5 w-3.5" aria-hidden="true" />
          Creador
        </Link>
        <a href="#tecnologia" className="hidden items-center gap-1.5 transition-colors hover:text-white sm:inline-flex">
          <LuFlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
          Tecnología
        </a>
        <a
          href="#casos-de-uso"
          onClick={(event) => {
            event.preventDefault();
            open('casos-de-uso');
          }}
          className="hidden items-center gap-1.5 transition-colors hover:text-white sm:inline-flex"
        >
          <LuLayers className="h-3.5 w-3.5" aria-hidden="true" />
          Casos de uso
        </a>
        <a
          href="#legal"
          onClick={(event) => {
            event.preventDefault();
            open('legal');
          }}
          className="hidden items-center gap-1.5 transition-colors hover:text-white sm:inline-flex"
        >
          <LuScale className="h-3.5 w-3.5" aria-hidden="true" />
          Legal
        </a>
        <a
          href="https://github.com/VECTORG99/Huascar"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-full px-3 py-1 text-zinc-300 transition-colors hover:text-white"
          style={glassStyle}
        >
          <LuGithub className="h-3.5 w-3.5" aria-hidden="true" />
          GitHub
        </a>
      </nav>
    </header>
  );
}

interface FooterLink {
  label: string;
  href?: string;
  external?: boolean;
  modal?: LandingModalId;
  icon: IconType;
}

const footerLinks: FooterLink[] = [
  { label: 'Creador', href: '/agents/new', icon: LuRocket },
  { label: 'Tecnología', href: '#tecnologia', icon: LuFlaskConical },
  { label: 'Casos de uso', modal: 'casos-de-uso', icon: LuLayers },
  { label: 'Legal', modal: 'legal', icon: LuScale },
  { label: 'GitHub', href: 'https://github.com/VECTORG99/Huascar', external: true, icon: LuGithub },
];

/**
 * Floating, pill-shaped footer — visible by default at reduced opacity so
 * it stays discoverable, and reaches full opacity when the cursor
 * approaches the bottom edge of the viewport or hovers the footer itself.
 * Kept to a single row of essential links plus a copyright line; secondary
 * information (tech stack, use cases, legal) opens in a modal instead of
 * expanding the footer itself.
 */
export function StickyFooter() {
  const [emphasized, setEmphasized] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { open } = useLandingModal();

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (e.clientY > window.innerHeight - REVEAL_ZONE_PX) {
        setEmphasized(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      } else if (emphasized) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setEmphasized(false), HIDE_DELAY_MS);
      }
    },
    [emphasized],
  );

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [handleMouseMove]);

  return (
    <footer
      className={`fixed inset-x-0 bottom-3 z-50 flex justify-center px-4 transition-opacity duration-500 ${
        emphasized ? 'opacity-100' : 'opacity-60 hover:opacity-100 focus-within:opacity-100'
      }`}
    >
      <div
        className="pointer-events-auto w-full max-w-3xl rounded-3xl px-6 py-4 text-center shadow-[0_8px_32px_rgba(0,0,0,0.35)] sm:px-8"
        style={glassStyle}
        aria-label="Pie de página"
        onMouseEnter={() => setEmphasized(true)}
        onMouseLeave={() => setEmphasized(false)}
      >
        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-zinc-400">
          {footerLinks.map((link) => {
            const Icon = link.icon;
            return (
              <li key={link.label}>
                {link.modal ? (
                  <button
                    type="button"
                    onClick={() => open(link.modal!)}
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {link.label}
                  </button>
                ) : link.external ? (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {link.label}
                  </a>
                ) : link.href!.startsWith('#') ? (
                  <a href={link.href} className="inline-flex items-center gap-1.5 transition-colors hover:text-white">
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {link.label}
                  </a>
                ) : (
                  <Link
                    href={link.href!}
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {link.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 border-t border-white/[0.06] pt-3 text-[11px] text-zinc-600">
          © {new Date().getFullYear()} Huascar y sus contribuidores · MPL-2.0
        </p>
      </div>
    </footer>
  );
}
