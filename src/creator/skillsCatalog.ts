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

export const SKILLS_CATALOG_VERSION = '2.0.0';

export const skillsCatalog: SkillCatalogItem[] = [
  // ─── Development ────────────────────────────────────────────────────────────
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
    id: 'code-review',
    name: 'Code Review',
    description: 'Revisa diffs evaluando legibilidad, correctitud, performance y adherencia a convenciones del equipo.',
    focus: 'development',
    tags: ['review', 'quality', 'workflow'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/workflow/engineering',
    sourceName: 'awesome-skills',
  },
  {
    id: 'refactor',
    name: 'Refactor',
    description: 'Reestructura código sin cambiar comportamiento: extrae funciones, elimina duplicación y simplifica.',
    focus: 'development',
    tags: ['refactoring', 'clean-code', 'workflow'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/workflow/engineering',
    sourceName: 'awesome-skills',
  },
  {
    id: 'test-generation',
    name: 'Test Generation',
    description: 'Genera tests unitarios y de integración cubriendo happy path, edge cases y regresiones conocidas.',
    focus: 'development',
    tags: ['testing', 'automation', 'quality'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/workflow/engineering',
    sourceName: 'awesome-skills',
  },
  {
    id: 'migration-guide',
    name: 'Migration Guide',
    description: 'Planifica migraciones de versión o framework con pasos reversibles, validaciones y rollback.',
    focus: 'development',
    tags: ['migration', 'planning', 'workflow'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/workflow/engineering',
    sourceName: 'awesome-skills',
  },
  {
    id: 'api-design',
    name: 'API Design',
    description: 'Diseña contratos REST/GraphQL/gRPC con versionado, paginación, errores consistentes y documentación.',
    focus: 'development',
    tags: ['api', 'contracts', 'design'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/workflow/engineering',
    sourceName: 'awesome-skills',
  },
  {
    id: 'performance-profiling',
    name: 'Performance Profiling',
    description: 'Identifica cuellos de botella con flamegraphs, benchmarks y propone optimizaciones medibles.',
    focus: 'development',
    tags: ['performance', 'profiling', 'optimization'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/workflow/engineering',
    sourceName: 'awesome-skills',
  },
  {
    id: 'dependency-audit',
    name: 'Dependency Audit',
    description: 'Evalúa dependencias por seguridad, licencia, mantenimiento y propone actualizaciones seguras.',
    focus: 'development',
    tags: ['dependencies', 'security', 'supply-chain'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/workflow/engineering',
    sourceName: 'awesome-skills',
  },
  {
    id: 'database-design',
    name: 'Database Design',
    description: 'Diseña esquemas normalizados, índices, migraciones y estrategias de escalado para SQL/NoSQL.',
    focus: 'development',
    tags: ['database', 'schema', 'migrations'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/workflow/engineering',
    sourceName: 'awesome-skills',
  },
  {
    id: 'monorepo-management',
    name: 'Monorepo Management',
    description: 'Configura workspaces, boundaries, scripts compartidos y CI selectivo para monorepos.',
    focus: 'development',
    tags: ['monorepo', 'workspaces', 'ci-cd'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/workflow/engineering',
    sourceName: 'awesome-skills',
  },
  {
    id: 'pair-programmer',
    name: 'Pair Programmer',
    description: 'Asiste en tiempo real con sugerencias contextuales, completado y explicaciones inline.',
    focus: 'development',
    tags: ['pairing', 'assistance', 'real-time'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/persona/enterprise',
    sourceName: 'awesome-skills',
  },
  {
    id: 'frontend-engineer',
    name: 'Frontend Engineer',
    description: 'Implementa UI accesible, responsive y performante con componentes reutilizables y design tokens.',
    focus: 'development',
    tags: ['frontend', 'ui', 'accessibility'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/persona/enterprise',
    sourceName: 'awesome-skills',
  },
  {
    id: 'backend-engineer',
    name: 'Backend Engineer',
    description: 'Diseña servicios escalables con APIs limpias, manejo de errores, logging y contratos claros.',
    focus: 'development',
    tags: ['backend', 'services', 'scalability'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/persona/enterprise',
    sourceName: 'awesome-skills',
  },

  // ─── Security ───────────────────────────────────────────────────────────────
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
  {
    id: 'vulnerability-scanner',
    name: 'Vulnerability Scanner',
    description: 'Escanea código y dependencias buscando CVEs, OWASP Top 10 y configuraciones inseguras.',
    focus: 'security',
    tags: ['vulnerabilities', 'cve', 'scanning'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/workflow/engineering',
    sourceName: 'awesome-skills',
  },
  {
    id: 'secret-detection',
    name: 'Secret Detection',
    description: 'Detecta tokens, claves API, certificados y credenciales hardcodeadas en código y configuración.',
    focus: 'security',
    tags: ['secrets', 'credentials', 'detection'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/workflow/engineering',
    sourceName: 'awesome-skills',
  },
  {
    id: 'compliance-check',
    name: 'Compliance Check',
    description: 'Verifica adherencia a SOC2, HIPAA, GDPR y PCI-DSS en código, infra y documentación.',
    focus: 'security',
    tags: ['compliance', 'regulations', 'audit'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/workflow/engineering',
    sourceName: 'awesome-skills',
  },
  {
    id: 'threat-modeling',
    name: 'Threat Modeling',
    description: 'Identifica superficies de ataque, actores, vectores y propone mitigaciones con prioridad por riesgo.',
    focus: 'security',
    tags: ['threats', 'risk', 'modeling'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/workflow/engineering',
    sourceName: 'awesome-skills',
  },
  {
    id: 'incident-forensics',
    name: 'Incident Forensics',
    description: 'Analiza logs, trazas y artefactos post-incidente para determinar causa raíz y timeline.',
    focus: 'security',
    tags: ['forensics', 'incident', 'analysis'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/workflow/engineering',
    sourceName: 'awesome-skills',
  },
  {
    id: 'access-review',
    name: 'Access Review',
    description: 'Audita permisos IAM, roles y políticas aplicando principio de mínimo privilegio.',
    focus: 'security',
    tags: ['iam', 'permissions', 'least-privilege'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/workflow/engineering',
    sourceName: 'awesome-skills',
  },
  {
    id: 'sbom-generation',
    name: 'SBOM Generation',
    description: 'Genera Software Bill of Materials en CycloneDX/SPDX para auditoría de supply chain.',
    focus: 'security',
    tags: ['sbom', 'supply-chain', 'inventory'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/workflow/engineering',
    sourceName: 'awesome-skills',
  },
  {
    id: 'penetration-testing',
    name: 'Penetration Testing',
    description: 'Ejecuta pruebas de intrusión controladas documentando hallazgos, severidad y remediación.',
    focus: 'security',
    tags: ['pentest', 'offensive', 'remediation'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/workflow/engineering',
    sourceName: 'awesome-skills',
  },

  // ─── Data & AI ──────────────────────────────────────────────────────────────
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
    id: 'data-pipeline-design',
    name: 'Data Pipeline Design',
    description: 'Diseña pipelines ETL/ELT con validación, idempotencia, retry y observabilidad.',
    focus: 'data-ai',
    tags: ['etl', 'pipelines', 'data-engineering'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/persona/ai-ml',
    sourceName: 'awesome-skills',
  },
  {
    id: 'prompt-engineering',
    name: 'Prompt Engineering',
    description: 'Optimiza prompts con técnicas de few-shot, chain-of-thought, structured output y evaluación.',
    focus: 'data-ai',
    tags: ['prompts', 'llm', 'optimization'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/persona/ai-ml',
    sourceName: 'awesome-skills',
  },
  {
    id: 'rag-optimization',
    name: 'RAG Optimization',
    description: 'Mejora pipelines RAG: chunking, embeddings, reranking, filtrado y evaluación de relevancia.',
    focus: 'data-ai',
    tags: ['rag', 'retrieval', 'embeddings'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/persona/ai-ml',
    sourceName: 'awesome-skills',
  },
  {
    id: 'model-evaluation',
    name: 'Model Evaluation',
    description: 'Diseña benchmarks, métricas y test suites para evaluar calidad de modelos ML/LLM.',
    focus: 'data-ai',
    tags: ['evaluation', 'benchmarks', 'metrics'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/persona/ai-ml',
    sourceName: 'awesome-skills',
  },
  {
    id: 'feature-engineering',
    name: 'Feature Engineering',
    description: 'Transforma datos crudos en features informativas para modelos predictivos.',
    focus: 'data-ai',
    tags: ['features', 'ml', 'transformation'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/persona/ai-ml',
    sourceName: 'awesome-skills',
  },
  {
    id: 'ml-deployment',
    name: 'ML Deployment',
    description: 'Despliega modelos con serving, versionado, A/B testing, monitoreo de drift y rollback.',
    focus: 'data-ai',
    tags: ['mlops', 'deployment', 'serving'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/persona/ai-ml',
    sourceName: 'awesome-skills',
  },
  {
    id: 'dataset-curation',
    name: 'Dataset Curation',
    description: 'Limpia, anota, balancea y versiona datasets para entrenamiento y evaluación.',
    focus: 'data-ai',
    tags: ['datasets', 'curation', 'quality'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/persona/ai-ml',
    sourceName: 'awesome-skills',
  },
  {
    id: 'embeddings-specialist',
    name: 'Embeddings Specialist',
    description: 'Selecciona, fine-tunea y optimiza modelos de embeddings para búsqueda semántica y clustering.',
    focus: 'data-ai',
    tags: ['embeddings', 'semantic-search', 'vectors'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/persona/ai-ml',
    sourceName: 'awesome-skills',
  },

  // ─── Operations ─────────────────────────────────────────────────────────────
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
    id: 'infrastructure-provisioning',
    name: 'Infrastructure Provisioning',
    description: 'Provisiona infra con IaC (Terraform/Pulumi/CDK) siguiendo inmutabilidad y drift detection.',
    focus: 'operations',
    tags: ['iac', 'terraform', 'provisioning'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/persona/enterprise',
    sourceName: 'awesome-skills',
  },
  {
    id: 'cost-optimization',
    name: 'Cost Optimization',
    description: 'Analiza consumo cloud, identifica recursos ociosos y propone right-sizing con ahorro estimado.',
    focus: 'operations',
    tags: ['cost', 'cloud', 'optimization'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/persona/enterprise',
    sourceName: 'awesome-skills',
  },
  {
    id: 'chaos-engineering',
    name: 'Chaos Engineering',
    description: 'Diseña y ejecuta experimentos de resiliencia con hipótesis, blast radius y rollback automático.',
    focus: 'operations',
    tags: ['chaos', 'resilience', 'testing'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/persona/enterprise',
    sourceName: 'awesome-skills',
  },
  {
    id: 'runbook-automation',
    name: 'Runbook Automation',
    description: 'Convierte runbooks manuales en scripts idempotentes con validaciones pre/post y logging.',
    focus: 'operations',
    tags: ['runbooks', 'automation', 'scripts'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/persona/enterprise',
    sourceName: 'awesome-skills',
  },
  {
    id: 'backup-recovery',
    name: 'Backup & Recovery',
    description: 'Implementa estrategias 3-2-1 con RPO/RTO definidos, verificación y drills periódicos.',
    focus: 'operations',
    tags: ['backup', 'disaster-recovery', 'rpo-rto'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/persona/enterprise',
    sourceName: 'awesome-skills',
  },
  {
    id: 'scaling-automation',
    name: 'Scaling Automation',
    description: 'Configura auto-scaling basado en métricas custom, cooldown y límites de costo.',
    focus: 'operations',
    tags: ['scaling', 'autoscaling', 'metrics'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/persona/enterprise',
    sourceName: 'awesome-skills',
  },
  {
    id: 'release-management',
    name: 'Release Management',
    description: 'Coordina releases con feature flags, canary deploys, changelogs y comunicación al equipo.',
    focus: 'operations',
    tags: ['releases', 'feature-flags', 'canary'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/persona/enterprise',
    sourceName: 'awesome-skills',
  },
  {
    id: 'observability-setup',
    name: 'Observability Setup',
    description: 'Instrumenta servicios con logs estructurados, métricas RED/USE, trazas distribuidas y alertas.',
    focus: 'operations',
    tags: ['observability', 'monitoring', 'tracing'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/persona/enterprise',
    sourceName: 'awesome-skills',
  },

  // ─── Documentation ──────────────────────────────────────────────────────────
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
    id: 'api-docs-generation',
    name: 'API Docs Generation',
    description: 'Genera documentación OpenAPI/AsyncAPI desde código con ejemplos, schemas y changelog.',
    focus: 'documentation',
    tags: ['openapi', 'documentation', 'automation'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/workflow/engineering',
    sourceName: 'awesome-skills',
  },
  {
    id: 'changelog-automation',
    name: 'Changelog Automation',
    description: 'Genera changelogs desde commits convencionales agrupando features, fixes y breaking changes.',
    focus: 'documentation',
    tags: ['changelog', 'automation', 'releases'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/workflow/engineering',
    sourceName: 'awesome-skills',
  },
  {
    id: 'architecture-diagrams',
    name: 'Architecture Diagrams',
    description: 'Genera diagramas C4, secuencia y despliegue desde código o descripción textual.',
    focus: 'documentation',
    tags: ['diagrams', 'c4', 'visualization'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/workflow/engineering',
    sourceName: 'awesome-skills',
  },
  {
    id: 'onboarding-guide',
    name: 'Onboarding Guide',
    description: 'Crea guías de setup, primeros pasos y contribución para nuevos miembros del equipo.',
    focus: 'documentation',
    tags: ['onboarding', 'guides', 'team'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/workflow/engineering',
    sourceName: 'awesome-skills',
  },
  {
    id: 'decision-records',
    name: 'Decision Records',
    description: 'Redacta ADRs con contexto, opciones evaluadas, decisión y consecuencias.',
    focus: 'documentation',
    tags: ['adr', 'decisions', 'architecture'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/workflow/engineering',
    sourceName: 'awesome-skills',
  },
  {
    id: 'technical-writer',
    name: 'Technical Writer',
    description: 'Redacta documentación técnica clara, estructurada y mantenible para usuarios y desarrolladores.',
    focus: 'documentation',
    tags: ['writing', 'technical-docs', 'clarity'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/workflow/engineering',
    sourceName: 'awesome-skills',
  },
  {
    id: 'knowledge-base-sync',
    name: 'Knowledge Base Sync',
    description: 'Mantiene sincronizada la documentación con el código detectando drift y proponiendo updates.',
    focus: 'documentation',
    tags: ['knowledge-base', 'sync', 'drift-detection'],
    sourceUrl: 'https://github.com/theneoai/awesome-skills/tree/main/skills/workflow/meta',
    sourceName: 'awesome-skills',
  },
];

const skillIndex = new Map(skillsCatalog.map((item) => [item.id, item]));

// #407: pre-computed, frozen response for the no-filter hot path.
const fullSkillsResponse = Object.freeze({
  version: SKILLS_CATALOG_VERSION,
  items: skillsCatalog,
});

/** Look up a single skill by its catalog id. */
export function getSkillById(id: string): SkillCatalogItem | undefined {
  return skillIndex.get(id);
}

export function getSkillsCatalog(filter?: { focus?: string; q?: string }): {
  version: string;
  items: SkillCatalogItem[];
} {
  // #407: the no-filter response is immutable per deploy; return a frozen
  // pre-computed instance instead of scanning on every request.
  if (!filter?.focus && !filter?.q) {
    return fullSkillsResponse;
  }
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
