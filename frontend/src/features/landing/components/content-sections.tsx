'use client';

import Link from 'next/link';
import type { IconType } from 'react-icons';
import {
  SiDocker,
  SiEslint,
  SiExpress,
  SiGithubactions,
  SiNextdotjs,
  SiNodedotjs,
  SiNpm,
  SiPrettier,
  SiReact,
  SiRender,
  SiTailwindcss,
  SiTypescript,
  SiVite,
  SiVitest,
} from 'react-icons/si';
import { LuGitBranch, LuLayers, LuScale } from 'react-icons/lu';
import { glassStyle, Modal, useLandingModal } from './landing-modal';
import { useTranslations } from '@/i18n';
import { glassButton, glassCard } from '@/lib/glass';
import { apiUrl } from '@/lib/api';
import { QuickStartCopy } from '@/components/ui/quick-start-copy';
import { useSectionFadeIn } from '../hooks/use-section-fade-in';

// ─── Hero ───────────────────────────────────────────────────────────────────
// Minimal by design: one headline, one subheadline, one call to action.
// Everything else (tech stack, use cases, legal) lives in on-demand modals
// so a first-time visitor gets the value proposition in a single glance
// instead of scrolling through secondary information.

const STARTUP_URL = `${apiUrl}/api/v1/creator/startup`;

export function HeroSection() {
  const t = useTranslations('landing');

  return (
    <section
      id="contenido-principal"
      className="flex min-h-screen sm:h-screen snap-start snap-always flex-col items-center justify-center px-6"
    >
      <div className="relative z-10 max-w-3xl text-center">
        <h1 className="text-5xl font-bold tracking-tight text-white text-shadow-[0_2px_8px_rgba(0,0,0,0.85)] sm:text-6xl lg:text-7xl xl:text-8xl">
          {t.heroTitle}
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white text-shadow-[0_2px_4px_rgba(0,0,0,0.85)] sm:text-lg">
          {t.heroDescription}
        </p>

        <div className="mt-8 max-w-lg mx-auto">
          <div className={glassCard('rounded-3xl p-5')}>
            <QuickStartCopy url={STARTUP_URL} size="md" />
          </div>
        </div>

        <p className="mx-auto mt-4 block w-fit text-sm text-white text-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
          {t.orConfigureManually}
        </p>

        <Link
          href="/agents/new"
          className={glassButton('mt-4 inline-flex items-center gap-2 text-sm font-medium text-white hover:text-white')}
        >
          <span>{t.heroCta}</span>
        </Link>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="h-8 w-[1px] bg-gradient-to-b from-white/20 to-transparent" />
      </div>
    </section>
  );
}

// ─── Value propositions ─────────────────────────────────────────────────────
// Three, not four — consolidated onto a single screen instead of one
// full-viewport scroll-snap section per item.

interface ValuePropMeta {
  hue: number;
  icon: IconType;
}

const VALUE_PROPS: ValuePropMeta[] = [
  { hue: 205, icon: LuGitBranch },
  { hue: 280, icon: LuScale },
  { hue: 160, icon: LuLayers },
];

function ValueIconBox({ icon: Icon, hue }: { icon: IconType; hue: number }) {
  return (
    <div
      className="mx-auto flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl"
      style={{
        background: `hsla(${hue}, 70%, 45%, 0.12)`,
        border: `1px solid hsla(${hue}, 70%, 60%, 0.35)`,
      }}
    >
      <Icon className="h-8 w-8" style={{ color: `hsla(${hue}, 80%, 70%, 1)` }} aria-hidden="true" />
    </div>
  );
}

function ValuePropsSection() {
  const t = useTranslations('landing');
  const ref = useSectionFadeIn<HTMLDivElement>();
  return (
    <section className="flex min-h-screen sm:h-screen snap-start snap-always items-center justify-center px-6">
      <h2 className="sr-only">{t.valuePropsTitle}</h2>
      <div ref={ref} className="section-content relative z-10 grid w-full max-w-5xl gap-6 sm:grid-cols-3">
        {VALUE_PROPS.map((prop, index) => {
          const copy = t.valueProps[index];
          if (!copy) return null;
          return (
            <div
              key={copy.title}
              className="group relative overflow-hidden rounded-3xl p-7 text-center transition-transform duration-300 hover:-translate-y-1"
              style={glassStyle}
            >
              <ValueIconBox icon={prop.icon} hue={prop.hue} />
              <h3 className="relative mt-4 text-lg font-bold" style={{ color: `hsla(${prop.hue}, 60%, 78%, 1)` }}>
                {copy.title}
              </h3>
              <p className="relative mt-2 text-sm leading-relaxed text-white/90">{copy.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Tecnología ─────────────────────────────────────────────────────────────
// Visible as its own scroll section (not a modal) — placed last, right
// before the final CTA, since it's supporting/trust information rather
// than the core pitch.

interface TechItem {
  label: string;
  url: string;
  Icon?: IconType;
  /** Brand colour applied to the icon + label text (solid RGB, no blend). */
  color: string;
}

interface TechGroupMeta {
  key: 'backend' | 'frontend' | 'quality' | 'infrastructure';
  items: TechItem[];
}

const TECH_GROUPS: TechGroupMeta[] = [
  {
    key: 'backend',
    items: [
      { label: 'Node.js', url: 'https://nodejs.org', Icon: SiNodedotjs, color: 'rgb(83,175,43)' },
      { label: 'TypeScript', url: 'https://www.typescriptlang.org', Icon: SiTypescript, color: 'rgb(49,120,198)' },
      { label: 'Express', url: 'https://expressjs.com', Icon: SiExpress, color: 'rgb(200,200,200)' },
    ],
  },
  {
    key: 'frontend',
    items: [
      { label: 'Next.js 16', url: 'https://nextjs.org', Icon: SiNextdotjs, color: 'rgb(255,255,255)' },
      { label: 'React 19', url: 'https://react.dev', Icon: SiReact, color: 'rgb(97,219,251)' },
      { label: 'Vite 8', url: 'https://vitejs.dev', Icon: SiVite, color: 'rgb(167,139,250)' },
      { label: 'Tailwind CSS 4', url: 'https://tailwindcss.com', Icon: SiTailwindcss, color: 'rgb(56,189,248)' },
      { label: 'TypeScript', url: 'https://www.typescriptlang.org', Icon: SiTypescript, color: 'rgb(49,120,198)' },
    ],
  },
  {
    key: 'quality',
    items: [
      {
        label: 'Node test runner',
        url: 'https://nodejs.org/api/test.html',
        Icon: SiNodedotjs,
        color: 'rgb(83,175,43)',
      },
      { label: 'Vitest', url: 'https://vitest.dev', Icon: SiVitest, color: 'rgb(223,224,226)' },
      { label: 'ESLint', url: 'https://eslint.org', Icon: SiEslint, color: 'rgb(75,174,223)' },
      { label: 'Prettier', url: 'https://prettier.io', Icon: SiPrettier, color: 'rgb(247,175,168)' },
      {
        label: 'GitHub Actions',
        url: 'https://github.com/features/actions',
        Icon: SiGithubactions,
        color: 'rgb(136,200,255)',
      },
    ],
  },
  {
    key: 'infrastructure',
    items: [
      { label: 'Docker', url: 'https://www.docker.com', Icon: SiDocker, color: 'rgb(36,150,237)' },
      { label: 'Docker Compose', url: 'https://docs.docker.com/compose/', Icon: SiDocker, color: 'rgb(36,150,237)' },
      {
        label: 'npm workspaces',
        url: 'https://docs.npmjs.com/cli/v10/using-npm/workspaces',
        Icon: SiNpm,
        color: 'rgb(203,13,43)',
      },
      { label: 'Render', url: 'https://render.com', Icon: SiRender, color: 'rgb(70,225,170)' },
    ],
  },
];

function TechStackSection() {
  const t = useTranslations('landing');
  const ref = useSectionFadeIn<HTMLDivElement>();
  return (
    <section
      id="tecnologia"
      className="flex min-h-screen sm:h-screen snap-start snap-always items-center justify-center px-6"
    >
      <div
        ref={ref}
        className="section-content relative z-10 w-full max-w-3xl rounded-3xl p-8 text-center sm:p-10"
        style={glassStyle}
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-white/80">{t.techStack.eyebrow}</span>
        <h2 className="mt-2 text-3xl font-bold text-white">{t.techStack.title}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-white/80">{t.techStack.subtitle}</p>
        <div className="mt-8 grid gap-6 text-center sm:grid-cols-2">
          {TECH_GROUPS.map((group) => {
            const groupTitle = t.techStack.groups[group.key].title;
            return (
              <div key={group.key}>
                <h3 className="text-center text-sm font-semibold text-white/80">{groupTitle}</h3>
                <ul className="mt-2 flex flex-wrap justify-center gap-2">
                  {group.items.map((item) => (
                    <li key={item.label}>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors"
                        style={{
                          backdropFilter: 'blur(6px)',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          color: item.color,
                        }}
                      >
                        {item.Icon && <item.Icon className="h-3.5 w-3.5" aria-hidden="true" />}
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ──────────────────────────────────────────────────────────────

function FinalCtaSection() {
  const t = useTranslations('landing');
  const ref = useSectionFadeIn<HTMLDivElement>();

  return (
    <section className="flex min-h-screen sm:h-screen snap-start snap-always items-center justify-center px-6">
      <div
        ref={ref}
        className="section-content relative z-10 w-full max-w-2xl rounded-3xl p-10 text-center"
        style={glassStyle}
      >
        <h2 className="text-3xl font-bold text-white">{t.ctaTitle}</h2>
        <p className="mt-3 max-w-md mx-auto text-white/80">{t.ctaDescription}</p>
        <Link
          href="/agents/new"
          className="mt-8 inline-flex items-center gap-2 rounded-full px-7 py-3 font-medium text-white transition-colors hover:text-white"
          style={glassStyle}
        >
          {t.ctaButton}
        </Link>
      </div>
    </section>
  );
}

export function ContentSections() {
  return (
    <>
      <ValuePropsSection />
      <TechStackSection />
      <FinalCtaSection />
      <LandingModals />
    </>
  );
}

// ─── On-demand modal: Legal ────────────────────────────────────────────────
// Legal information is secondary content that would clutter a first-glance
// landing page. It only renders when the user clicks the footer link.

function LegalModalContent() {
  const t = useTranslations('landing');
  return (
    <>
      <span className="text-xs font-semibold uppercase tracking-wider text-white/70">{t.legal.eyebrow}</span>
      <h2 className="mt-2 text-3xl font-bold text-white">{t.legal.title}</h2>
      <div className="mt-6 flex flex-col gap-4 text-sm leading-relaxed text-white/80">
        <p>
          {t.legal.p1Before}
          <a
            href="https://github.com/VECTORG99/Artemisa/blob/development/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/90 underline underline-offset-2 hover:text-white"
          >
            {t.legal.p1Link}
          </a>
          {t.legal.p1After}
        </p>
        <p>{t.legal.p2}</p>
        <p className="text-white/70">
          {t.legal.p3Before}
          <a
            href="https://github.com/VECTORG99/Artemisa"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/80 underline underline-offset-2 hover:text-white"
          >
            {t.legal.p3Link}
          </a>
          {t.legal.p3After}
        </p>
      </div>
    </>
  );
}

function LandingModals() {
  const { openModal, close } = useLandingModal();
  const t = useTranslations('landing');
  return (
    <Modal open={openModal === 'legal'} onClose={close} title={t.legal.title}>
      <LegalModalContent />
    </Modal>
  );
}
