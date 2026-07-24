'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { glassStyle, useLandingModal, type LandingModalId } from './landing-modal';

const REVEAL_ZONE_PX = 56;
const HIDE_DELAY_MS = 1400;

/**
 * Chevron hint shown when the floating header/footer is hidden, nudging the
 * user to move the cursor to the edge of the viewport to reveal it.
 */
function EdgeHint({ direction }: { direction: 'up' | 'down' }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-40 flex justify-center transition-opacity duration-500"
      style={direction === 'up' ? { top: 6 } : { bottom: 6 }}
      aria-hidden="true"
    >
      <svg
        className="h-3.5 w-3.5"
        style={{ animation: 'rgb-cycle 4s linear infinite, bounce-hint 2.2s infinite' }}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={direction === 'up' ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
      </svg>
    </div>
  );
}

/**
 * Floating, pill-shaped header — hidden by default, revealed when the cursor
 * approaches the top edge of the viewport. A subtle chevron hint (⌃) stays
 * visible at the very top so users know to hover there.
 */
export function StickyHeader() {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { open } = useLandingModal();

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (e.clientY < REVEAL_ZONE_PX) {
        setVisible(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      } else if (visible) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setVisible(false), HIDE_DELAY_MS);
      }
    },
    [visible],
  );

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [handleMouseMove]);

  return (
    <>
      <div
        className={`pointer-events-none fixed inset-x-0 top-0 z-40 transition-opacity duration-300 ${
          visible ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <EdgeHint direction="up" />
      </div>

      <header
        className={`fixed inset-x-0 top-3 z-50 flex justify-center px-4 transition-all duration-500 ${
          visible ? 'translate-y-0 opacity-100' : '-translate-y-6 opacity-0'
        }`}
      >
        <nav
          className="pointer-events-auto flex w-full max-w-3xl flex-wrap items-center justify-center gap-5 rounded-full px-6 py-3 text-center text-xs font-medium text-zinc-400 shadow-[0_8px_32px_rgba(0,0,0,0.35)] sm:py-2.5"
          style={glassStyle}
          aria-label="Navegación principal"
        >
          <Link href="/agents/new" className="transition-colors hover:text-white">
            Creador
          </Link>
          <Link href="/dashboard" className="transition-colors hover:text-white">
            Dashboard
          </Link>
          <a href="#tecnologia" className="hidden transition-colors hover:text-white sm:inline">
            Tecnología
          </a>
          <a
            href="#casos-de-uso"
            onClick={(event) => {
              event.preventDefault();
              open('casos-de-uso');
            }}
            className="hidden transition-colors hover:text-white sm:inline"
          >
            Casos de uso
          </a>
          <a
            href="#legal"
            onClick={(event) => {
              event.preventDefault();
              open('legal');
            }}
            className="hidden transition-colors hover:text-white sm:inline"
          >
            Legal
          </a>
          <a
            href="https://github.com/VECTORG99/Huascar"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-zinc-300 transition-colors hover:text-white"
            style={glassStyle}
          >
            GitHub
          </a>
        </nav>
      </header>
    </>
  );
}

interface FooterLink {
  label: string;
  href?: string;
  external?: boolean;
  modal?: LandingModalId;
}

const footerLinks: FooterLink[] = [
  { label: 'Creador', href: '/agents/new' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Tecnología', href: '#tecnologia' },
  { label: 'Casos de uso', modal: 'casos-de-uso' },
  { label: 'Legal', modal: 'legal' },
  { label: 'GitHub', href: 'https://github.com/VECTORG99/Huascar', external: true },
];

/**
 * Floating, pill-shaped footer — hidden by default, revealed when the cursor
 * approaches the bottom edge of the viewport. Kept to a single row of
 * essential links plus a copyright line; secondary information (tech
 * stack, use cases, legal) opens in a modal instead of expanding the
 * footer itself.
 */
export function StickyFooter() {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { open } = useLandingModal();

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (e.clientY > window.innerHeight - REVEAL_ZONE_PX) {
        setVisible(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      } else if (visible) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setVisible(false), HIDE_DELAY_MS);
      }
    },
    [visible],
  );

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [handleMouseMove]);

  return (
    <>
      <div
        className={`pointer-events-none fixed inset-x-0 bottom-0 z-40 transition-opacity duration-300 ${
          visible ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <EdgeHint direction="down" />
      </div>

      <footer
        className={`fixed inset-x-0 bottom-3 z-50 flex justify-center px-4 transition-all duration-500 ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
        }`}
      >
        <div
          className="pointer-events-auto w-full max-w-3xl rounded-3xl px-6 py-4 text-center shadow-[0_8px_32px_rgba(0,0,0,0.35)] sm:px-8"
          style={glassStyle}
          aria-label="Pie de página"
        >
          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-zinc-400">
            {footerLinks.map((link) => (
              <li key={link.label}>
                {link.modal ? (
                  <button
                    type="button"
                    onClick={() => open(link.modal!)}
                    className="transition-colors hover:text-white"
                  >
                    {link.label}
                  </button>
                ) : link.external ? (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-white"
                  >
                    {link.label}
                  </a>
                ) : link.href!.startsWith('#') ? (
                  <a href={link.href} className="transition-colors hover:text-white">
                    {link.label}
                  </a>
                ) : (
                  <Link href={link.href!} className="transition-colors hover:text-white">
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-white/[0.06] pt-3 text-[11px] text-zinc-600">
            © {new Date().getFullYear()} Huascar y sus contribuidores · MPL-2.0
          </p>
        </div>
      </footer>
    </>
  );
}
