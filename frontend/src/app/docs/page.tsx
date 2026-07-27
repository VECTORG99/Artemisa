import type { Metadata } from 'next';
import Link from 'next/link';
import { LuArrowLeft, LuFileText, LuBookOpen, LuScale, LuLayers, LuServer } from 'react-icons/lu';

export const metadata: Metadata = {
  title: 'Documentación — Huascar',
  description: 'Documentación oficial de Huascar: arquitectura, API, deployment, troubleshooting y más.',
};

interface DocLink {
  href: string;
  label: string;
  description: string;
  external?: boolean;
}

interface DocSection {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  docs: DocLink[];
}

const sections: DocSection[] = [
  {
    title: 'Proyecto',
    icon: LuFileText,
    docs: [
      {
        href: 'https://github.com/VECTORG99/Huascar/blob/development/README.md',
        label: 'README',
        description: 'Visión general, quick start y estructura.',
        external: true,
      },
      {
        href: 'https://github.com/VECTORG99/Huascar/blob/development/AGENTS.md',
        label: 'AGENTS.md',
        description: 'Directivas para agentes de IA.',
        external: true,
      },
      {
        href: 'https://github.com/VECTORG99/Huascar/blob/development/CONTEXT.md',
        label: 'CONTEXT.md',
        description: 'Contexto técnico completo.',
        external: true,
      },
      {
        href: 'https://github.com/VECTORG99/Huascar/blob/development/CONTRIBUTING.md',
        label: 'CONTRIBUTING.md',
        description: 'Guía para contribuidores.',
        external: true,
      },
      {
        href: 'https://github.com/VECTORG99/Huascar/blob/development/CHANGELOG.md',
        label: 'CHANGELOG.md',
        description: 'Historial de cambios.',
        external: true,
      },
    ],
  },
  {
    title: 'Arquitectura y Deploy',
    icon: LuServer,
    docs: [
      {
        href: 'https://github.com/VECTORG99/Huascar/blob/development/docs/architecture.md',
        label: 'Arquitectura',
        description: 'Arquitectura interna del Creator.',
        external: true,
      },
      {
        href: 'https://github.com/VECTORG99/Huascar/blob/development/docs/api-reference.md',
        label: 'API Reference',
        description: 'Referencia completa de la API.',
        external: true,
      },
      {
        href: 'https://github.com/VECTORG99/Huascar/blob/development/docs/deployment.md',
        label: 'Deployment',
        description: 'Despliegue local, Docker y Render.',
        external: true,
      },
      {
        href: 'https://github.com/VECTORG99/Huascar/blob/development/docs/self-hosting.md',
        label: 'Self-Hosting',
        description: 'Guía para VPS/bare metal.',
        external: true,
      },
    ],
  },
  {
    title: 'Guías',
    icon: LuBookOpen,
    docs: [
      {
        href: 'https://github.com/VECTORG99/Huascar/blob/development/docs/troubleshooting.md',
        label: 'Troubleshooting',
        description: 'Solución de problemas del Creator.',
        external: true,
      },
      {
        href: 'https://github.com/VECTORG99/Huascar/blob/development/docs/apply-bundle.md',
        label: 'Aplicar un Bundle',
        description: 'Cómo aplicar y validar un bundle.',
        external: true,
      },
      {
        href: 'https://github.com/VECTORG99/Huascar/blob/development/docs/use_cases.md',
        label: 'Casos de Uso',
        description: 'Casos de uso del producto.',
        external: true,
      },
      {
        href: 'https://github.com/VECTORG99/Huascar/blob/development/docs/CONVENTIONS.md',
        label: 'Convenciones',
        description: 'Convenciones de código y docs.',
        external: true,
      },
    ],
  },
  {
    title: 'Decisiones de Arquitectura (ADRs)',
    icon: LuLayers,
    docs: [
      {
        href: 'https://github.com/VECTORG99/Huascar/blob/development/docs/adr/0007-npm-workspaces-for-shared-types-package.md',
        label: 'ADR-0007: npm workspaces',
        description: 'Decisión de usar npm workspaces.',
        external: true,
      },
      {
        href: 'https://github.com/VECTORG99/Huascar/blob/development/docs/adr/0008-remove-runtime-generator-only.md',
        label: 'ADR-0008: Remove Runtime',
        description: 'Decisión de eliminar el Runtime.',
        external: true,
      },
    ],
  },
  {
    title: 'Referencia',
    icon: LuScale,
    docs: [
      {
        href: 'https://github.com/VECTORG99/Huascar/blob/development/docs/reference/README.md',
        label: 'Artefactos de Referencia',
        description: 'Índice de artefactos rescatados.',
        external: true,
      },
      {
        href: 'https://github.com/VECTORG99/Huascar/blob/development/docs/reference/security-policy-guide.md',
        label: 'Guía: Security Policy',
        description: 'Cómo implementar la allowlist.',
        external: true,
      },
      {
        href: 'https://github.com/VECTORG99/Huascar/blob/development/docs/reference/steering-roles-guide.md',
        label: 'Guía: Steering Roles',
        description: 'Cómo adaptar los roles.',
        external: true,
      },
    ],
  },
];

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
          >
            <LuArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver a la landing
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-white">Documentación</h1>
        <p className="mt-2 text-zinc-400">
          Documentación oficial de Huascar. Todos los enlaces abren el archivo en GitHub.
        </p>

        <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm text-zinc-400">
          <p>
            <strong className="text-zinc-200">Para agentes de IA:</strong> consulta{' '}
            <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs text-white/80">
              GET /api/v1/creator/docs
            </code>{' '}
            para obtener el catálogo de documentación en formato JSON con metadatos.
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-10">
          {sections.map((section) => {
            const SectionIcon = section.icon;
            return (
              <section key={section.title}>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                  <SectionIcon className="h-5 w-5 text-zinc-400" aria-hidden="true" />
                  {section.title}
                </h2>
                <ul className="mt-4 flex flex-col gap-3">
                  {section.docs.map((doc) => (
                    <li key={doc.label}>
                      <a
                        href={doc.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-white/15 hover:bg-white/[0.05]"
                      >
                        <LuFileText
                          className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500 group-hover:text-zinc-300"
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <div className="font-medium text-zinc-200 group-hover:text-white">{doc.label}</div>
                          <div className="text-sm text-zinc-500">{doc.description}</div>
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
