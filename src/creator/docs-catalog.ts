import fs from 'node:fs';
import path from 'node:path';

export interface DocEntry {
  path: string;
  title: string;
  description: string;
  category: 'project' | 'architecture' | 'conventions' | 'adr' | 'reference';
  size: number;
}

const DOC_ROOTS: Array<{ root: string; prefix: string; category: DocEntry['category'] }> = [
  { root: '', prefix: '', category: 'project' },
  { root: 'docs', prefix: 'docs/', category: 'architecture' },
  { root: 'docs/adr', prefix: 'docs/adr/', category: 'adr' },
  { root: 'docs/reference', prefix: 'docs/reference/', category: 'reference' },
];

const KNOWN_DOCS: Record<string, { title: string; description: string }> = {
  'README.md': { title: 'README', description: 'Visión general del proyecto, quick start y estructura.' },
  'AGENTS.md': { title: 'AGENTS.md', description: 'Directivas para agentes de IA que modifican este repo.' },
  'CONTEXT.md': {
    title: 'CONTEXT.md',
    description: 'Contexto técnico completo: arquitectura, rutas, contrato de generación.',
  },
  'docs/CONTRIBUTING.md': { title: 'CONTRIBUTING.md', description: 'Guía para contribuidores humanos y de IA.' },
  'docs/CHANGELOG.md': { title: 'CHANGELOG.md', description: 'Historial de cambios del proyecto.' },
  'docs/architecture.md': { title: 'Arquitectura', description: 'Arquitectura interna del Creator.' },
  'docs/deployment.md': { title: 'Deployment', description: 'Despliegue local, Docker y Render.' },
  'docs/self-hosting.md': { title: 'Self-Hosting', description: 'Guía de self-hosting en VPS/bare metal.' },
  'docs/troubleshooting.md': { title: 'Troubleshooting', description: 'Solución de problemas del Creator.' },
  'docs/apply-bundle.md': { title: 'Aplicar un Bundle', description: 'Cómo aplicar y validar un bundle generado.' },
  'docs/api-reference.md': { title: 'API Reference', description: 'Referencia completa de la API del Creator.' },
  'docs/debug-tooling.md': { title: 'Debug Tooling', description: 'Herramientas de debug disponibles en dev.' },
  'docs/CONVENTIONS.md': { title: 'Convenciones', description: 'Convenciones de código, tests y docs.' },
  'docs/adr/0007-npm-workspaces-for-shared-types-package.md': {
    title: 'ADR-0007: npm workspaces',
    description: 'Decisión de usar npm workspaces para shared types.',
  },
  'docs/adr/0008-remove-runtime-generator-only.md': {
    title: 'ADR-0008: Remove Runtime',
    description: 'Decisión de eliminar el Runtime; Artemisa es solo generador.',
  },
  'docs/reference/README.md': {
    title: 'Artefactos de Referencia',
    description: 'Índice de artefactos de referencia rescatados del Runtime.',
  },
  'docs/reference/security-policy-guide.md': {
    title: 'Guía: Security Policy',
    description: 'Cómo implementar la allowlist de seguridad.',
  },
  'docs/reference/steering-roles-guide.md': {
    title: 'Guía: Steering Roles',
    description: 'Cómo adaptar los roles de steering.',
  },
};

/**
 * Scans the repo for documentation files and returns a deterministic list
 * with metadata. Used by the /api/v1/creator/docs endpoint so AI agents
 * can discover and consume the official documentation.
 */
export function listDocumentationFiles(repoRoot: string = process.cwd()): DocEntry[] {
  const entries: DocEntry[] = [];

  for (const { root, prefix, category } of DOC_ROOTS) {
    const dir = root ? path.resolve(repoRoot, root) : repoRoot;
    if (!fs.existsSync(dir)) continue;

    const files = fs
      .readdirSync(dir)
      .filter((file) => file.endsWith('.md') && !file.startsWith('template') && !file.endsWith('.en.md'))
      // The repo root also holds files that are not project documentation, and
      // `GET /docs/content` serves whatever this catalog lists, so the root
      // scope is limited to the curated entries below (`docs/` is documentation
      // by definition and stays dynamic).
      .filter((file) => root !== '' || Object.hasOwn(KNOWN_DOCS, file));

    for (const file of files) {
      const fullPath = root ? `${root}/${file}` : file;
      const stat = fs.statSync(path.resolve(dir, file));
      const meta = KNOWN_DOCS[fullPath] ?? {
        title: file.replace(/\.md$/, ''),
        description: '',
      };

      entries.push({
        path: prefix + file,
        title: meta.title,
        description: meta.description,
        category,
        size: stat.size,
      });
    }
  }

  // Sort deterministically: project docs first, then by path
  const categoryOrder: Record<DocEntry['category'], number> = {
    project: 0,
    architecture: 1,
    conventions: 2,
    adr: 3,
    reference: 4,
  };

  return entries.sort((a, b) => {
    const catDiff = categoryOrder[a.category] - categoryOrder[b.category];
    if (catDiff !== 0) return catDiff;
    return a.path.localeCompare(b.path);
  });
}
