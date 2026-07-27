'use client';

import Link from 'next/link';
import { LuRocket, LuFlaskConical, LuBookOpen, LuScale, LuGithub, LuUsers } from 'react-icons/lu';
import type { IconType } from 'react-icons';
import { glassStyle, useLandingModal, type LandingModalId } from './landing-modal';
import { useTranslations } from '@/i18n';

/**
 * Floating, pill-shaped header — always fully opaque so the liquid-glass
 * background, blur and border remain visible over the starfield.
 * Contains the main navigation tabs of the site.
 */
export function StickyHeader() {
  const { open } = useLandingModal();
  const t = useTranslations('landing');

  return (
    <header className="fixed inset-x-0 top-3 z-50 flex justify-center px-4">
      <nav
        className="pointer-events-auto flex w-full max-w-3xl flex-wrap items-center justify-center gap-5 rounded-full px-6 py-3 text-center text-xs font-medium text-white shadow-[0_8px_32px_rgba(0,0,0,0.35)] sm:py-2.5"
        style={glassStyle}
        aria-label={t.nav.ariaLabel}
      >
        <Link
          href="/agents/new"
          aria-label={`${t.nav.creator}`}
          className="flex items-center gap-1.5 transition-colors hover:text-white"
        >
          <LuRocket className="h-3.5 w-3.5" aria-hidden="true" />
          {t.nav.creator}
        </Link>
        <Link
          href="/docs"
          aria-label={`${t.nav.docs}`}
          className="flex items-center gap-1.5 transition-colors hover:text-white"
        >
          <LuBookOpen className="h-3.5 w-3.5" aria-hidden="true" />
          {t.nav.docs}
        </Link>
        <Link
          href="/desarrolladores"
          aria-label={`${t.nav.team}`}
          className="flex items-center gap-1.5 transition-colors hover:text-white"
        >
          <LuUsers className="h-3.5 w-3.5" aria-hidden="true" />
          {t.nav.team}
        </Link>
        <a
          href="#tecnologia"
          aria-label={`${t.nav.technology}`}
          className="hidden items-center gap-1.5 transition-colors hover:text-white sm:inline-flex"
        >
          <LuFlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
          {t.nav.technology}
        </a>
      </nav>
    </header>
  );
}

interface FooterLink {
  labelKey: 'team' | 'legal' | 'github';
  href?: string;
  external?: boolean;
  modal?: LandingModalId;
  icon: IconType;
  ariaLabelKey: 'team' | 'legal' | 'github';
}

const footerLinksConfig: FooterLink[] = [
  {
    labelKey: 'team',
    href: '/desarrolladores',
    icon: LuUsers,
    ariaLabelKey: 'team',
  },
  {
    labelKey: 'legal',
    modal: 'legal',
    icon: LuScale,
    ariaLabelKey: 'legal',
  },
  {
    labelKey: 'github',
    href: 'https://github.com/VECTORG99/Artemisa',
    external: true,
    icon: LuGithub,
    ariaLabelKey: 'github',
  },
];

/**
 * Floating, pill-shaped footer — always fully opaque so the liquid-glass
 * background, blur and border remain visible over the starfield.
 * Contains legal information and secondary/extra links.
 */
export function StickyFooter() {
  const { open } = useLandingModal();
  const t = useTranslations('landing');

  return (
    <footer className="fixed inset-x-0 bottom-3 z-50 flex justify-center px-4">
      <div
        className="pointer-events-auto w-full max-w-3xl rounded-3xl px-6 py-4 text-center shadow-[0_8px_32px_rgba(0,0,0,0.35)] sm:px-8"
        style={glassStyle}
        aria-label={t.footer.ariaLabel}
      >
        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-white">
          {footerLinksConfig.map((link) => {
            const Icon = link.icon;
            const label = t.footer[link.labelKey];
            return (
              <li key={link.labelKey}>
                {link.modal ? (
                  <button
                    type="button"
                    onClick={() => open(link.modal!)}
                    aria-label={label}
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {label}
                  </button>
                ) : link.external ? (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {label}
                  </a>
                ) : (
                  <Link
                    href={link.href!}
                    aria-label={label}
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {label}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 border-t border-white/[0.06] pt-3 text-[11px] text-white/80">
          {t.footer.copyright.replace('{year}', String(new Date().getFullYear()))}
        </p>
      </div>
    </footer>
  );
}
