/**
 * Curated, versioned snapshot of real agent skills — not a live fetch.
 *
 * Kept as static data (like src/creator/catalog.ts) rather than fetching
 * awesome-skills.github.io or GitHub at request time: the Creator is
 * explicitly stateless and network-free (see README "Por qué generación y
 * ejecución están separadas"), and the project is currently prioritizing low
 * infra load over freshness. Entries are curated from
 * https://github.com/theneoai/awesome-skills (956 skills across
 * persona/tool/workflow kinds) — this is a representative sample, not the
 * full catalog. Update by re-curating from the source repo's CATALOG.md.
 */

export interface SkillCatalogItem {
  id: string;
  name: string;
  description: string;
  /** Matches the skills_focus question options in decisionTree.ts, plus 'custom'. */
  focus: 'development' | 'security' | 'data-ai' | 'operations' | 'documentation';
  tags: string[];
  /** Link to the skill's source file or repo section. */
  sourceUrl: string;
  sourceName: string;
}

export const SKILLS_CATALOG_VERSION = '1.0.0';

export const skillsCatalog: SkillCatalogItem[] = [
  {
    id: 'debug-diagnose',
    name: 'Debug & Diagnose',
    description: 'Reproduce el fallo, aísla la causa raíz con evidencia y aplica la corrección mínima segura.',
    focus: 'development',
    tags: ['debugging', 'workflow', 'root-cause'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/workflow/engineering',
    sourceName: 'awesome-skills',
  },
  {
    id: 'architecture-review',
    name: 'Architecture Review',
    description: 'Evalúa límites, dependencias y trade-offs de un cambio de arquitectura antes de aprobarlo.',
    focus: 'development',
    tags: ['architecture', 'review', 'workflow'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/workflow/engineering',
    sourceName: 'awesome-skills',
  },
  {
    id: 'issue-triage',
    name: 'Issue Triage',
    description: 'Clasifica, prioriza y enruta issues entrantes usando severidad, impacto y evidencia reproducible.',
    focus: 'development',
    tags: ['triage', 'workflow', 'planning'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/workflow/engineering',
    sourceName: 'awesome-skills',
  },
  {
    id: 'to-prd',
    name: 'To PRD',
    description: 'Convierte una idea o issue ambiguo en un documento de requisitos verificable.',
    focus: 'documentation',
    tags: ['product', 'requirements', 'workflow'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/workflow/engineering',
    sourceName: 'awesome-skills',
  },
  {
    id: 'anthropic-researcher',
    name: 'Anthropic Researcher',
    description: 'Metodología de investigación en IA constitucional e interpretabilidad al estilo Anthropic.',
    focus: 'data-ai',
    tags: ['research', 'ai-safety', 'persona'],
    sourceUrl:
      'https://github.com/theneoai/awesome-skills/blob/main/skills/persona/enterprise/anthropic/anthropic-researcher/SKILL.md',
    sourceName: 'awesome-skills',
  },
  {
    id: 'nvidia-ml-engineer',
    name: 'NVIDIA ML Engineer',
    description: 'Optimización CUDA y despliegue de modelos sobre plataformas GPU siguiendo prácticas de NVIDIA.',
    focus: 'data-ai',
    tags: ['ml', 'gpu', 'persona'],
    sourceUrl:
      'https://github.com/theneoai/awesome-skills/blob/main/skills/persona/enterprise/nvidia/nvidia-ml-engineer/SKILL.md',
    sourceName: 'awesome-skills',
  },
  {
    id: 'sre-incident-response',
    name: 'Incident Response (SRE)',
    description: 'Diagnóstico guiado de incidentes en producción: evidencia, hipótesis y plan de rollback reversible.',
    focus: 'operations',
    tags: ['sre', 'incident', 'observability'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/packages/software.md',
    sourceName: 'awesome-skills',
  },
  {
    id: 'devops-engineer',
    name: 'DevOps Engineer',
    description: 'Mantiene CI/CD, contenedores y automatización operativa con configuraciones seguras por defecto.',
    focus: 'operations',
    tags: ['devops', 'ci-cd', 'persona'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/packages/software.md',
    sourceName: 'awesome-skills',
  },
  {
    id: 'toyota-engineer',
    name: 'Toyota Engineer',
    description: 'Aplica TPS, Just-In-Time, Kaizen y Jidoka a procesos de ingeniería y control de calidad.',
    focus: 'operations',
    tags: ['process', 'quality', 'persona'],
    sourceUrl:
      'https://github.com/theneoai/awesome-skills/blob/main/skills/persona/enterprise/toyota/toyota-engineer/SKILL.md',
    sourceName: 'awesome-skills',
  },
  {
    id: 'write-skill',
    name: 'Write Skill',
    description: 'Meta-skill para redactar nuevos SKILL.md consistentes con el esquema y convenciones del repositorio.',
    focus: 'documentation',
    tags: ['meta', 'authoring', 'workflow'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/workflow/meta',
    sourceName: 'awesome-skills',
  },
  {
    id: 'mckinsey-consultant',
    name: 'McKinsey Consultant',
    description: 'Estructura hallazgos y recomendaciones con MECE, issue trees y principio de la pirámide.',
    focus: 'documentation',
    tags: ['consulting', 'communication', 'persona'],
    sourceUrl:
      'https://github.com/theneoai/awesome-skills/blob/main/skills/persona/enterprise/mckinsey/mckinsey-consultant/SKILL.md',
    sourceName: 'awesome-skills',
  },
  {
    id: 'security-code-review',
    name: 'Security Code Review',
    description:
      'Revisa diffs buscando secretos expuestos, vulnerabilidades de inyección y anti-patrones de seguridad.',
    focus: 'security',
    tags: ['security', 'code-review', 'persona'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/packages/software.md',
    sourceName: 'awesome-skills',
  },
];

const skillIndex = new Map(skillsCatalog.map((item) => [item.id, item]));

/** Look up a single skill by its catalog id. */
export function getSkillById(id: string): SkillCatalogItem | undefined {
  return skillIndex.get(id);
}

export function getSkillsCatalog(filter?: { focus?: string; q?: string }): {
  version: string;
  items: SkillCatalogItem[];
} {
  let items = skillsCatalog;
  if (filter?.focus) {
    items = items.filter((item) => item.focus === filter.focus);
  }
  if (filter?.q) {
    const q = filter.q.toLowerCase();
    items = items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }
  return { version: SKILLS_CATALOG_VERSION, items };
}
