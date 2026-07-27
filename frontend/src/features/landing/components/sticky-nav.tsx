'use client';

import Link from 'next/link';
import { LuRocket, LuFlaskConical, LuLayers, LuScale, LuGithub, LuBookOpen } from 'react-icons/lu';
import type { IconType } from 'react-icons';
import { glassStyle, useLandingModal, type LandingModalId } from './landing-modal';

/**
 * Floating, pill-shaped header — always fully opaque so the liquid-glass
 * background, blur and border remain visible over the starfield.
 */
export function StickyHeader() {
  const { open } = useLandingModal();

  return (
    <header className="fixed inset-x-0 top-3 z-50 flex justify-center px-4">
      <nav
        className="pointer-events-auto flex w-full max-w-3xl flex-wrap items-center justify-center gap-5 rounded-full px-6 py-3 text-center text-xs font-medium text-white shadow-[0_8px_32px_rgba(0,0,0,0.35)] sm:py-2.5"
        style={glassStyle}
        aria-label="Navegación principal"
      >
        <Link
          href="/agents/new"
          aria-label="Ir al Creador de agentes"
          className="flex items-center gap-1.5 transition-colors hover:text-white"
        >
          <LuRocket className="h-3.5 w-3.5" aria-hidden="true" />
          Creador
        </Link>
        <Link
          href="/docs"
          aria-label="Ver documentación oficial"
          className="flex items-center gap-1.5 transition-colors hover:text-white"
        >
          <LuBookOpen className="h-3.5 w-3.5" aria-hidden="true" />
          Docs
        </Link>
        <a
          href="#tecnologia"
          aria-label="Ir a sección Tecnología"
          className="hidden items-center gap-1.5 transition-colors hover:text-white sm:inline-flex"
        >
          <LuFlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
          Tecnología
        </a>
        <a
          href="#casos-de-uso"
          aria-label="Ver casos de uso"
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
          aria-label="Ver información legal"
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
          aria-label="GitHub (se abre en nueva pestaña)"
          className="flex items-center gap-1.5 rounded-full px-3 py-1 text-white/80 transition-colors hover:text-white"
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
  ariaLabel?: string;
}

const footerLinks: FooterLink[] = [
  { label: 'Creador', href: '/agents/new', icon: LuRocket, ariaLabel: 'Ir al Creador de agentes' },
  { label: 'Docs', href: '/docs', icon: LuBookOpen, ariaLabel: 'Ver documentación oficial' },
  { label: 'Tecnología', href: '#tecnologia', icon: LuFlaskConical, ariaLabel: 'Ir a sección Tecnología' },
  { label: 'Casos de uso', modal: 'casos-de-uso', icon: LuLayers, ariaLabel: 'Ver casos de uso' },
  { label: 'Legal', modal: 'legal', icon: LuScale, ariaLabel: 'Ver información legal' },
  {
    label: 'GitHub',
    href: 'https://github.com/VECTORG99/Huascar',
    external: true,
    icon: LuGithub,
    ariaLabel: 'GitHub (se abre en nueva pestaña)',
  },
];

/**
 * Floating, pill-shaped footer — always fully opaque so the liquid-glass
 * background, blur and border remain visible over the starfield.
 * Kept to a single row of essential links plus a copyright line; secondary
 * information (tech stack, use cases, legal) opens in a modal instead of
 * expanding the footer itself.
 */
export function StickyFooter() {
  const { open } = useLandingModal();

  return (
    <footer className="fixed inset-x-0 bottom-3 z-50 flex justify-center px-4">
      <div
        className="pointer-events-auto w-full max-w-3xl rounded-3xl px-6 py-4 text-center shadow-[0_8px_32px_rgba(0,0,0,0.35)] sm:px-8"
        style={glassStyle}
        aria-label="Pie de página"
      >
        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-white">
          {footerLinks.map((link) => {
            const Icon = link.icon;
            return (
              <li key={link.label}>
                {link.modal ? (
                  <button
                    type="button"
                    onClick={() => open(link.modal!)}
                    aria-label={link.ariaLabel}
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
                    aria-label={link.ariaLabel}
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {link.label}
                  </a>
                ) : link.href!.startsWith('#') ? (
                  <a
                    href={link.href}
                    aria-label={link.ariaLabel}
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {link.label}
                  </a>
                ) : (
                  <Link
                    href={link.href!}
                    aria-label={link.ariaLabel}
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
        <p className="mt-3 border-t border-white/[0.06] pt-3 text-[11px] text-white/80">
          © {new Date().getFullYear()} Huascar y sus contribuidores · MPL-2.0
        </p>
      </div>
    </footer>
  );
}
