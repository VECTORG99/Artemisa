'use client';

import Link from 'next/link';
import type { IconType } from 'react-icons';
import {
  SiDocker,
  SiEslint,
  SiExpress,
  SiGithubactions,
  SiModelcontextprotocol,
  SiNextdotjs,
  SiNodedotjs,
  SiNpm,
  SiPrettier,
  SiReact,
  SiRender,
  SiSqlite,
  SiTailwindcss,
  SiTypescript,
  SiVercel,
  SiVite,
  SiVitest,
} from 'react-icons/si';
import { glassStyle, Modal, useLandingModal } from './landing-modal';
import { useTranslations } from '@/i18n';
import { glassButton, glassCard } from '@/lib/glass';
import { apiUrl } from '@/lib/api';
import { QuickStartCopy } from '@/components/ui/quick-start-copy';

// ─── Hero ───────────────────────────────────────────────────────────────────
// Minimal by design: one headline, one subheadline, one call to action.
// Everything else (tech stack, use cases, legal) lives in on-demand modals
// so a first-time visitor gets the value proposition in a single glance
// instead of scrolling through secondary information.

const STARTUP_URL = `${apiUrl}/api/v1/creator/startup`;

export function HeroSection() {
  const t = useTranslations('landing');

  return (
    <section className="flex h-screen snap-start snap-always flex-col items-center justify-center px-6">
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
          ── o configura manualmente ──
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

interface ValueProp {
  title: string;
  description: string;
  hue: number;
  icon: string;
}

const valueProps: ValueProp[] = [
  {
    title: 'Árbol de decisiones determinista',
    description:
      '32 preguntas stateless que se adaptan a tu contexto: desarrollo, producción o ambos. Sin un LLM decidiendo la arquitectura por ti.',
    hue: 200,
    icon: '/images/arbol.svg',
  },
  {
    title: 'Recomendaciones con evidencia',
    description:
      'Cada sugerencia incluye motivo, trade-offs y alternativas. Sabes por qué se elige cada opción, no solo qué elegir.',
    hue: 280,
    icon: '/images/recomendaciones.svg',
  },
  {
    title: 'Bundle listo para aplicar',
    description:
      'Blueprint, manifest, hashes SHA-256, INSTALL.md y WHY.md. Reproducible, auditable y seguro desde el primer commit.',
    hue: 160,
    icon: '/images/bundle.svg',
  },
];

function GlassIcon({ src, alt }: { src: string; alt: string; hue: number }) {
  return (
    <div className="relative mx-auto h-40 w-40 shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={512}
        height={512}
        className="h-full w-full object-contain"
        style={{ mixBlendMode: 'screen' }}
      />
    </div>
  );
}

function ValuePropsSection() {
  return (
    <section className="flex h-screen snap-start snap-always items-center justify-center px-6">
      <div className="relative z-10 grid w-full max-w-5xl gap-6 sm:grid-cols-3">
        {valueProps.map((prop) => (
          <div
            key={prop.title}
            className="group relative overflow-hidden rounded-3xl p-7 text-center transition-transform duration-300 hover:-translate-y-1"
            style={glassStyle}
          >
            <GlassIcon src={prop.icon} alt={prop.title} hue={prop.hue} />
            <h2 className="relative mt-4 text-lg font-bold" style={{ color: `hsla(${prop.hue}, 60%, 78%, 1)` }}>
              {prop.title}
            </h2>
            <p className="relative mt-2 text-sm leading-relaxed text-white/90">{prop.description}</p>
          </div>
        ))}
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
}

const techGroups: { title: string; items: TechItem[] }[] = [
  {
    title: 'Backend',
    items: [
      { label: 'Node.js', url: 'https://nodejs.org', Icon: SiNodedotjs },
      { label: 'TypeScript', url: 'https://www.typescriptlang.org', Icon: SiTypescript },
      { label: 'Express', url: 'https://expressjs.com', Icon: SiExpress },
      { label: 'SQLite (better-sqlite3)', url: 'https://www.sqlite.org', Icon: SiSqlite },
      { label: 'Vercel AI SDK', url: 'https://sdk.vercel.ai', Icon: SiVercel },
      { label: 'Model Context Protocol', url: 'https://modelcontextprotocol.io', Icon: SiModelcontextprotocol },
    ],
  },
  {
    title: 'Frontend',
    items: [
      { label: 'Next.js 16', url: 'https://nextjs.org', Icon: SiNextdotjs },
      { label: 'React 19', url: 'https://react.dev', Icon: SiReact },
      { label: 'Vite', url: 'https://vitejs.dev', Icon: SiVite },
      { label: 'Tailwind CSS 4', url: 'https://tailwindcss.com', Icon: SiTailwindcss },
      { label: 'TypeScript', url: 'https://www.typescriptlang.org', Icon: SiTypescript },
    ],
  },
  {
    title: 'Calidad y CI',
    items: [
      { label: 'Node test runner', url: 'https://nodejs.org/api/test.html', Icon: SiNodedotjs },
      { label: 'Vitest', url: 'https://vitest.dev', Icon: SiVitest },
      { label: 'Playwright', url: 'https://playwright.dev' },
      { label: 'ESLint', url: 'https://eslint.org', Icon: SiEslint },
      { label: 'Prettier', url: 'https://prettier.io', Icon: SiPrettier },
      { label: 'GitHub Actions', url: 'https://github.com/features/actions', Icon: SiGithubactions },
    ],
  },
  {
    title: 'Infraestructura',
    items: [
      { label: 'Docker', url: 'https://www.docker.com', Icon: SiDocker },
      { label: 'Docker Compose', url: 'https://docs.docker.com/compose/', Icon: SiDocker },
      { label: 'npm workspaces', url: 'https://docs.npmjs.com/cli/v10/using-npm/workspaces', Icon: SiNpm },
      { label: 'Render', url: 'https://render.com', Icon: SiRender },
    ],
  },
];

function TechStackSection() {
  return (
    <section id="tecnologia" className="flex h-screen snap-start snap-always items-center justify-center px-6">
      <div className="relative z-10 w-full max-w-3xl rounded-3xl p-8 text-center sm:p-10" style={glassStyle}>
        <span className="text-xs font-semibold uppercase tracking-wider text-white/80">Stack real del proyecto</span>
        <h2 className="mt-2 text-3xl font-bold text-white">Tecnología que usamos</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-white/80">
          Huascar es open source. Este es el stack exacto con el que está construido.
        </p>
        <div className="mt-8 grid gap-6 text-center sm:grid-cols-2">
          {techGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-center text-sm font-semibold text-white/80">{group.title}</h3>
              <ul className="mt-2 flex flex-wrap justify-center gap-2">
                {group.items.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-white/80 transition-colors hover:text-white"
                      style={{
                        backdropFilter: 'blur(6px)',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      {item.Icon && <item.Icon className="h-3.5 w-3.5" aria-hidden="true" />}
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ──────────────────────────────────────────────────────────────

function FinalCtaSection() {
  const t = useTranslations('landing');

  return (
    <section className="flex h-screen snap-start snap-always items-center justify-center px-6">
      <div className="relative z-10 w-full max-w-2xl rounded-3xl p-10 text-center" style={glassStyle}>
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

// ─── On-demand modals: Casos de uso, Legal ─────────────────────────────────
// These carry secondary information that matters for trust and depth but
// would clutter a first-glance landing page. They only render when the
// user explicitly clicks a nav/footer link — never part of the scroll.

interface UseCase {
  title: string;
  description: string;
}

const useCases: UseCase[] = [
  {
    title: 'Scaffolding de proyectos',
    description:
      'Genera estructuras base de proyectos, módulos y componentes siguiendo las convenciones definidas en el blueprint.',
  },
  {
    title: 'Pruebas automáticas',
    description:
      'Escribe tests unitarios y de integración a partir del código existente y del criterio de éxito definido en el árbol de decisiones.',
  },
  {
    title: 'Revisión de Pull Requests',
    description:
      'Analiza cambios, detecta riesgos y explica hallazgos priorizados con evidencia, sin hacer merge por sí mismo.',
  },
];

function UseCasesModalContent() {
  return (
    <>
      <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
        Productividad del desarrollador
      </span>
      <h2 className="mt-2 text-3xl font-bold text-white">Casos de uso</h2>
      <p className="mt-2 max-w-xl text-sm text-white/80">
        Automatización de tareas repetitivas, definida por el propio agente que generas.
      </p>
      <div className="mt-8 flex flex-col gap-4">
        {useCases.map((useCase) => (
          <div key={useCase.title} className="rounded-xl p-5" style={glassStyle}>
            <h3 className="text-base font-semibold text-white">{useCase.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-white/80">{useCase.description}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function LegalModalContent() {
  return (
    <>
      <span className="text-xs font-semibold uppercase tracking-wider text-white/60">Información legal</span>
      <h2 className="mt-2 text-3xl font-bold text-white">Licencia y uso</h2>
      <div className="mt-6 flex flex-col gap-4 text-sm leading-relaxed text-white/80">
        <p>
          Huascar se distribuye bajo la{' '}
          <a
            href="https://github.com/VECTORG99/Huascar/blob/development/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/90 underline underline-offset-2 hover:text-white"
          >
            Mozilla Public License 2.0 (MPL-2.0)
          </a>
          . Es una licencia de copyleft débil: puedes usar, modificar y distribuir el software, incluso combinado con
          código propietario, pero cualquier archivo modificado de este proyecto debe conservarse bajo MPL-2.0 y
          mantener el aviso de copyright y contribuidores originales.
        </p>
        <p>
          El creador no ejecuta código, no realiza llamadas de red ni usa credenciales durante la generación de
          configuración: es una compilación pura, determinista y auditable. La ejecución de agentes vía{' '}
          <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs text-white/80">/api/agent/execute</code> es un
          componente separado, sujeto a los controles de autenticación y autorización del backend.
        </p>
        <p className="text-white/60">
          Código fuente completo, historial de cambios, autores y reporte de issues disponibles en{' '}
          <a
            href="https://github.com/VECTORG99/Huascar"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/80 underline underline-offset-2 hover:text-white"
          >
            github.com/VECTORG99/Huascar
          </a>
          .
        </p>
      </div>
    </>
  );
}

function LandingModals() {
  const { openModal, close } = useLandingModal();
  return (
    <>
      <Modal open={openModal === 'casos-de-uso'} onClose={close} title="Casos de uso">
        <UseCasesModalContent />
      </Modal>
      <Modal open={openModal === 'legal'} onClose={close} title="Información legal">
        <LegalModalContent />
      </Modal>
    </>
  );
}
