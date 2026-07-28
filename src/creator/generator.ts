import crypto from 'crypto';
import {
  AgentBlueprint,
  CreatorAnswers,
  CreatorInputError,
  GeneratedAgentBundle,
  GeneratedArtifact,
} from './domain.js';
import { describeCatalogSelection, evaluateDecisionTree } from './decisionTree.js';
import { getSkillById } from './skillsCatalog.js';
import { getMcpById } from './mcpCatalog.js';

const GENERATOR_VERSION = '1.0.0';

/** Shell command allowlist entry, matching src/kiro/schemas/security-policy.schema.json. */
interface AllowedCommandEntry {
  binary: string;
  allowed_args: string[];
}

export function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, stableValue(child)]),
    );
  }
  return value;
}

function stableJson(value: unknown): string {
  return JSON.stringify(stableValue(value), null, 2) + '\n';
}

function sha256(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

export function slugify(value: string): string {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return slug || 'generated-agent';
}

function stringAnswer(answers: CreatorAnswers, id: string): string {
  const value = answers[id];
  return typeof value === 'string' ? value : '';
}

function boolAnswer(answers: CreatorAnswers, id: string): boolean {
  return answers[id] === true;
}

function listAnswer(answers: CreatorAnswers, id: string): string[] {
  const value = answers[id];
  return Array.isArray(value) ? value : [];
}

function validateArtifactPath(path: string): void {
  if (
    !path ||
    path.startsWith('/') ||
    path.includes('\\') ||
    path.split('/').some((segment) => segment === '..' || segment === '')
  ) {
    throw new CreatorInputError(
      'Se intentó generar una ruta de artefacto insegura.',
      [{ path: 'artifact.path', message: path }],
      422,
    );
  }
}

function assertNoLiteralSecrets(content: string, path: string): void {
  const patterns = [
    /\bghp_[A-Za-z0-9]{20,}\b/,
    /\bsk-[A-Za-z0-9_-]{20,}\b/,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\bAKIA[0-9A-Z]{16}\b/,
  ];
  if (patterns.some((pattern) => pattern.test(content))) {
    throw new CreatorInputError(
      'El preview contiene un valor con apariencia de secreto.',
      [{ path, message: 'Reemplaza secretos por referencias de entorno como ${SECRET_NAME}.' }],
      422,
    );
  }
}

function makeArtifact(
  path: string,
  kind: GeneratedArtifact['kind'],
  mediaType: GeneratedArtifact['mediaType'],
  description: string,
  content: string,
): GeneratedArtifact {
  validateArtifactPath(path);
  assertNoLiteralSecrets(content, path);
  return { path, kind, mediaType, description, content, sha256: sha256(content) };
}

function jsonArtifact(
  path: string,
  kind: GeneratedArtifact['kind'],
  description: string,
  value: unknown,
): GeneratedArtifact {
  return makeArtifact(path, kind, 'application/json', description, stableJson(value));
}

function markdownArtifact(
  path: string,
  kind: GeneratedArtifact['kind'],
  description: string,
  content: string,
): GeneratedArtifact {
  const normalized = content.trim() + '\n';
  return makeArtifact(path, kind, 'text/markdown', description, normalized);
}

function buildBlueprint(answers: CreatorAnswers, evaluation: ReturnType<typeof evaluateDecisionTree>): AgentBlueprint {
  if (!evaluation.progress.complete || evaluation.issues.length > 0) {
    const issues =
      evaluation.issues.length > 0
        ? evaluation.issues
        : [
            {
              path: evaluation.nextQuestion ? `answers.${evaluation.nextQuestion.id}` : 'answers',
              message: 'Completa todas las preguntas requeridas antes de generar.',
            },
          ];
    throw new CreatorInputError('El árbol de decisiones está incompleto.', issues, 422);
  }

  const name = stringAnswer(answers, 'agent_name').trim();
  const target = stringAnswer(answers, 'environment') as AgentBlueprint['environments']['target'];
  const technologies = listAnswer(answers, 'technologies');
  const targets = listAnswer(answers, 'agent_targets');
  const knowledgeEnabled = boolAnswer(answers, 'knowledge_enabled');
  const prReviewEnabled = boolAnswer(answers, 'pr_review_enabled');
  const capabilities = listAnswer(answers, 'capabilities');
  const production = target === 'production' || target === 'both' || target === 'testing' || target === 'staging';
  const development = target === 'development' || target === 'both' || target === 'local';

  const skillsEnabled = boolAnswer(answers, 'skills_enabled');
  const skillsFocus = stringAnswer(answers, 'skills_focus');
  const mcpsEnabled = boolAnswer(answers, 'mcps_enabled');

  // Resolve the effective skill selection. Only the 'custom' focus exposes
  // `skills_selection` in the tree; the curated profiles preselect skills in
  // the UI but do not persist a per-skill list, so we only consume the
  // explicit selection here.
  const skillItems =
    skillsEnabled && skillsFocus === 'custom'
      ? listAnswer(answers, 'skills_selection')
          .map((id) => getSkillById(id))
          .filter((item): item is NonNullable<typeof item> => Boolean(item))
          .map((item) => ({
            id: item.id,
            name: item.name,
            focus: item.focus,
            sourceUrl: item.sourceUrl,
          }))
      : [];

  const mcpItems = mcpsEnabled
    ? listAnswer(answers, 'mcps_selection')
        .map((id) => getMcpById(id))
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          sourceUrl: item.sourceUrl,
        }))
    : [];

  return {
    schemaVersion: '1.0.0',
    identity: {
      name,
      slug: slugify(name),
      description: stringAnswer(answers, 'objective').trim(),
    },
    purpose: {
      type: stringAnswer(answers, 'purpose'),
      objective: stringAnswer(answers, 'objective').trim(),
      successCriteria: stringAnswer(answers, 'success_criteria').trim(),
      persona: stringAnswer(answers, 'agent_persona').trim() || null,
    },
    project: {
      stage: stringAnswer(answers, 'project_stage'),
      architecture: stringAnswer(answers, 'architecture'),
      technologies,
      repositoryProvider: stringAnswer(answers, 'repository_provider'),
    },
    environments: {
      target,
      developmentSetup: development ? stringAnswer(answers, 'development_setup') : null,
      deploymentTarget: production ? stringAnswer(answers, 'deployment_target') : null,
      cloudProvider: production ? inferCloudProvider(stringAnswer(answers, 'deployment_target')) : null,
      containerPlatforms: production ? listAnswer(answers, 'container_platforms') : [],
    },
    devops: {
      ciCd: listAnswer(answers, 'ci_cd'),
      infrastructure: production ? listAnswer(answers, 'infrastructure') : [],
      observability: production ? listAnswer(answers, 'observability') : [],
      compliance: listAnswer(answers, 'security_controls'),
    },
    agent: {
      autonomy: stringAnswer(answers, 'autonomy'),
      capabilities,
      targets,
      requireHumanApproval:
        boolAnswer(answers, 'human_approval') ||
        production ||
        capabilities.some((value) => value === 'deploy' || value === 'operate-production'),
    },
    knowledge: {
      enabled: knowledgeEnabled,
      sources: knowledgeEnabled ? listAnswer(answers, 'knowledge_sources') : [],
    },
    prReview: {
      enabled: prReviewEnabled,
      focus: prReviewEnabled ? listAnswer(answers, 'pr_review_focus') : [],
    },
    features: {
      hooks: boolAnswer(answers, 'hooks_enabled'),
      skills: boolAnswer(answers, 'skills_enabled'),
      steering: true,
      agentsMd: targets.includes('agents-md'),
      kiro: targets.includes('kiro'),
    },
    skills: {
      enabled: skillsEnabled,
      focus: skillsFocus,
      items: skillItems,
    },
    testing: {
      tools: listAnswer(answers, 'testing_tools'),
    },
    integrations: {
      mcps: mcpItems,
    },
    recommendations: evaluation.recommendations,
  };
}

export function inferCloudProvider(target: string): string | null {
  if (target.startsWith('aws-')) return 'aws';
  if (target.startsWith('azure-')) return 'azure';
  if (target.startsWith('gcp-')) return 'gcp';
  if (['vercel', 'render', 'flyio'].includes(target)) return target;
  if (target === 'vps') return 'self-managed';
  return null;
}

function buildSystemPrompt(blueprint: AgentBlueprint): string {
  /**
   * Concise imperative constraints for prompts and YAML instruction fields.
   * Context (objective, stack, architecture) is surfaced separately so
   * artifacts can avoid duplicating it under both Context and Constraints.
   */
  return buildAgentConstraintLines(blueprint).join('\n');
}

/**
 * Map blueprint capabilities to allowlisted shell commands. Only capabilities
 * that genuinely need shell access contribute entries, and argument allowlists
 * stay narrow (read-only or quality-gate commands) so the generated policy is
 * safe to apply before review.
 */
function buildAllowedCommands(
  capabilities: string[],
  languages: string[],
  testingTools: string[],
): AllowedCommandEntry[] {
  const entries = new Map<string, Set<string>>();
  const add = (binary: string, args: string[]) => {
    const existing = entries.get(binary) ?? new Set<string>();
    for (const arg of args) existing.add(arg);
    entries.set(binary, existing);
  };

  // Read-only inspection commands are safe for any agent that reads a repo.
  if (capabilities.includes('read-repository') || capabilities.includes('review-pr')) {
    add('git', ['status', 'log', 'diff', 'branch', 'show', 'ls-files', 'rev-parse']);
  }

  if (capabilities.includes('run-tests')) {
    const hasNode = languages.some((lang) => ['typescript', 'javascript', 'nodejs'].includes(lang));
    const hasPython = languages.includes('python');
    const hasGo = languages.includes('go');
    const hasRust = languages.includes('rust');
    const hasJava = languages.some((lang) => ['java', 'kotlin'].includes(lang));

    if (hasNode || languages.length === 0) {
      add('npm', ['ci', 'install', 'run build', 'run test', 'run lint', 'run typecheck']);
      add('npx', ['tsc --noEmit']);
    }
    if (hasPython) {
      add('python', ['-m pytest', '-m unittest']);
      add('pytest', []);
    }
    if (hasGo) add('go', ['test', 'build', 'vet']);
    if (hasRust) add('cargo', ['test', 'build', 'check', 'clippy']);
    if (hasJava) add('mvn', ['test', 'verify']);
  }

  // Testing tools from the catalog enrich allowed commands with specific runners.
  if (testingTools.length > 0) {
    if (testingTools.includes('e2e-tests')) {
      add('npx', ['playwright test', 'cypress run']);
    }
    if (testingTools.includes('sast')) {
      add('npx', ['eslint .', 'semgrep scan']);
    }
    if (testingTools.includes('dependency-scan')) {
      add('npm', ['audit']);
      add('npx', ['snyk test']);
    }
  }

  if (capabilities.includes('inspect-infrastructure') || capabilities.includes('operate-production')) {
    add('kubectl', ['get', 'describe', 'logs']);
    add('docker', ['ps', 'logs', 'inspect']);
  }

  return [...entries.entries()]
    .map(([binary, args]) => ({ binary, allowed_args: [...args].sort() }))
    .sort((a, b) => a.binary.localeCompare(b.binary));
}

function buildWhy(blueprint: AgentBlueprint): string {
  const sections: string[] = [];
  const addSection = (heading: string, body: string) => {
    if (!body.trim()) return;
    sections.push(`## ${heading}\n\n${body.trim()}\n`);
  };

  addSection(
    'Problema y éxito',
    [
      `Objetivo: ${blueprint.purpose.objective}`,
      `Criterio de éxito: ${blueprint.purpose.successCriteria}`,
      `Tipo: ${blueprint.purpose.type}`,
    ]
      .map((l) => `- ${l}`)
      .join('\n'),
  );

  const contextLines: string[] = [
    `Stack: ${blueprint.project.technologies.map(describeCatalogSelection).join(', ') || 'No especificado'}`,
    `Arquitectura: ${describeCatalogSelection(blueprint.project.architecture)}`,
    `Entorno: ${blueprint.environments.target}`,
  ];
  if (blueprint.environments.deploymentTarget) {
    contextLines.push(`Destino de producción: ${describeCatalogSelection(blueprint.environments.deploymentTarget)}`);
  }
  if (blueprint.devops.ciCd.length > 0) {
    contextLines.push(`CI/CD: ${blueprint.devops.ciCd.map(describeCatalogSelection).join(', ')}`);
  }
  addSection('Contexto técnico', contextLines.map((l) => `- ${l}`).join('\n'));

  if (blueprint.environments.developmentSetup) {
    addSection('Entorno de desarrollo', `- Setup: ${blueprint.environments.developmentSetup}`);
  }
  if (blueprint.environments.containerPlatforms.length > 0) {
    addSection(
      'Plataformas de contenedores',
      `- Seleccionadas: ${blueprint.environments.containerPlatforms.map(describeCatalogSelection).join(', ')}`,
    );
  }
  if (blueprint.devops.infrastructure.length > 0) {
    addSection(
      'Infraestructura como código',
      `- Herramientas: ${blueprint.devops.infrastructure.map(describeCatalogSelection).join(', ')}`,
    );
  }
  if (blueprint.devops.observability.length > 0) {
    addSection('Observabilidad', `- Stack: ${blueprint.devops.observability.map(describeCatalogSelection).join(', ')}`);
  }
  if (blueprint.devops.compliance.length > 0) {
    addSection(
      'Decisiones de seguridad',
      [
        `Controles: ${blueprint.devops.compliance.map(describeCatalogSelection).join(', ')}`,
        `Autonomía: ${blueprint.agent.autonomy}`,
        `Aprobación humana: ${blueprint.agent.requireHumanApproval ? 'requerida' : 'no requerida'}`,
      ]
        .map((l) => `- ${l}`)
        .join('\n'),
    );
  }

  if (blueprint.agent.capabilities.length > 0) {
    addSection('Capacidades', `- ${blueprint.agent.capabilities.map((c) => c.replace(/-/g, ' ')).join(', ')}`);
  }

  const integrations: string[] = [];
  if (blueprint.knowledge.enabled) {
    integrations.push(`Fuentes: ${blueprint.knowledge.sources.map(describeCatalogSelection).join(', ')}`);
  }
  if (blueprint.prReview.enabled) {
    integrations.push(`PR review: ${blueprint.prReview.focus.join(', ')}`);
  }
  if (blueprint.integrations.mcps.length > 0) {
    integrations.push(`MCPs: ${blueprint.integrations.mcps.map((m) => m.name).join(', ')}`);
  }
  if (integrations.length > 0) {
    addSection('Knowledge e integraciones', integrations.map((l) => `- ${l}`).join('\n'));
  }

  if (blueprint.recommendations.length > 0) {
    const recs = blueprint.recommendations.map((r) => `- **${r.title}:** ${r.reason}`).join('\n');
    addSection('Recomendaciones explicables', recs);

    const benefits = [...new Set(blueprint.recommendations.flatMap((r) => r.benefits))];
    if (benefits.length > 0) {
      addSection('Beneficios', benefits.map((b) => `- ${b}`).join('\n'));
    }

    const tradeoffs = [...new Set(blueprint.recommendations.flatMap((r) => r.tradeoffs))];
    if (tradeoffs.length > 0) {
      addSection('Trade-offs', tradeoffs.map((t) => `- ${t}`).join('\n'));
    }
  } else {
    addSection('Recomendaciones explicables', '- No se activaron recomendaciones adicionales.');
  }

  addSection(
    'Done when',
    buildAgentDoneWhen(blueprint)
      .map((l) => `- ${l}`)
      .join('\n'),
  );

  return `# Por qué se generó este agente\n\n${sections.join('\n')}`;
}

function buildInstall(blueprint: AgentBlueprint): string {
  const production =
    blueprint.environments.target === 'production' ||
    blueprint.environments.target === 'both' ||
    blueprint.environments.target === 'testing' ||
    blueprint.environments.target === 'staging';
  const development =
    blueprint.environments.target === 'development' ||
    blueprint.environments.target === 'both' ||
    blueprint.environments.target === 'local';

  // #317: stack-specific guidance
  const stackHints: string[] = [];
  const containers = blueprint.environments.containerPlatforms;
  const technologies = blueprint.project.technologies;
  const ciCd = blueprint.devops.ciCd;

  if (
    containers.includes('docker') ||
    containers.includes('docker-compose') ||
    blueprint.environments.developmentSetup === 'docker-compose'
  ) {
    stackHints.push('- **Docker Compose:** ejecuta `docker-compose up` para levantar el entorno de desarrollo.');
  }
  if (containers.includes('kubernetes') || containers.includes('helm')) {
    stackHints.push('- **Kubernetes/Helm:** usa `helm install <release> <chart>` para desplegar en un clúster.');
  }
  if (technologies.includes('nextjs'))
    stackHints.push('- **Next.js:** ejecuta `npm run dev` para el servidor de desarrollo.');
  else if (technologies.includes('express'))
    stackHints.push('- **Express:** ejecuta `npm run dev` para el servidor de desarrollo.');
  else if (technologies.includes('django'))
    stackHints.push('- **Django:** ejecuta `python manage.py runserver` para desarrollo.');
  else if (technologies.includes('rails')) stackHints.push('- **Rails:** ejecuta `bin/rails server` para desarrollo.');
  else if (technologies.includes('spring-boot'))
    stackHints.push('- **Spring Boot:** ejecuta `./mvnw spring-boot:run` para desarrollo.');
  else if (technologies.includes('fastapi'))
    stackHints.push('- **FastAPI:** ejecuta `uvicorn main:app --reload` para desarrollo.');

  if (ciCd.length > 0) {
    stackHints.push(
      `- **CI/CD (${ciCd.map(describeCatalogSelection).join(', ')}):** configura el pipeline para lint, test y build automáticos.`,
    );
  }

  const stackSection =
    stackHints.length > 0
      ? `## 3b. Comandos específicos del stack

${stackHints.join('\n')}

`
      : '';

  const devSection = development
    ? `## ${production ? '4a' : '4'}. Uso en desarrollo

- Limita filesystem al repositorio destino.
- Allowlista comandos de build/test.
- Revisa los parches antes de aplicarlos o hacer commit.
`
    : '';
  const prodSection = production
    ? `## ${development ? '4b' : '4'}. Paso a producción

- Despliega primero en staging.
- Configura logs, métricas, trazas y alertas.
- Verifica backup, rollback y límites de costo.
- Ejecuta con identidad separada del usuario administrador.
- Mantén deploy y operación detrás de aprobación humana.
`
    : '';
  return `# Instalación del agente ${blueprint.identity.name}

> Este bundle es un **preview**: Artemisa no escribió archivos ni ejecutó herramientas. Revisa cada contenido antes de copiarlo.

## 1. Copiar los artefactos

Copia únicamente los archivos del target que utilizarás. Conserva las rutas relativas del manifest.

## 2. Configurar secretos

- Crea las variables mencionadas como \`\${NOMBRE}\` en el gestor de secretos del entorno.
- Nunca reemplaces referencias por valores dentro del repositorio.
- Usa identidades y tokens de mínimo privilegio.

## 3. Validar localmente

1. Revisa \`blueprint.json\` y \`docs/WHY.md\`.
2. Ajusta rutas RAG al workspace permitido.
3. Fija versiones exactas de servidores MCP.
4. Ejecuta lint, tests y una prueba en modo asesor.
5. Verifica que herramientas no seleccionadas permanezcan deshabilitadas.

${stackSection}${devSection}${prodSection}`;
}

function buildProjectCommand(technologies: string[], type: 'build' | 'test' | 'lint'): string {
  const hasNode = technologies.some((t) => ['typescript', 'javascript', 'nodejs', 'nextjs', 'react'].includes(t));
  const hasPython = technologies.includes('python');
  const hasGo = technologies.includes('go');
  const hasRust = technologies.includes('rust');
  const hasJava = technologies.some((t) => ['java', 'kotlin', 'spring-boot'].includes(t));
  if (type === 'build') {
    if (hasNode) return 'npm ci && npm run build';
    if (hasPython) return 'pip install -r requirements.txt';
    if (hasGo) return 'go build ./...';
    if (hasRust) return 'cargo build';
    if (hasJava) return './mvnw package -DskipTests';
    return '<comando de build del proyecto>';
  }
  if (type === 'test') {
    if (hasNode) return 'npm run test';
    if (hasPython) return 'pytest';
    if (hasGo) return 'go test ./...';
    if (hasRust) return 'cargo test';
    if (hasJava) return './mvnw test';
    return '<comando de test del proyecto>';
  }
  if (type === 'lint') {
    if (hasNode) return 'npm run lint';
    if (hasPython) return 'ruff check .';
    if (hasGo) return 'gofmt -w . && go vet ./...';
    if (hasRust) return 'cargo clippy';
    if (hasJava) return './mvnw spotless:apply';
    return '<comando de lint del proyecto>';
  }
  return '';
}

function buildAgentsMd(blueprint: AgentBlueprint): string {
  const stack = blueprint.project.technologies.map(describeCatalogSelection).join(', ') || 'No especificado';
  const testingLines =
    blueprint.testing.tools.length > 0
      ? blueprint.testing.tools
          .map(describeCatalogSelection)
          .map((t) => `- ${t}`)
          .join('\n')
      : '- Sin herramientas de testing específicas. Usar los comandos de test del stack.';
  const knowledgeLines = blueprint.knowledge.enabled
    ? blueprint.knowledge.sources
        .map(describeCatalogSelection)
        .map((s) => `- ${s}`)
        .join('\n')
    : '- No se configuraron fuentes de conocimiento adicionales.';
  const mcpLines =
    blueprint.integrations.mcps.length > 0
      ? blueprint.integrations.mcps.map((mcp) => `- **${mcp.name}** (${mcp.category}): ${mcp.sourceUrl}`).join('\n')
      : '- No se habilitaron integraciones MCP.';
  const commands = buildAllowedCommandLines(blueprint);
  const capabilities = buildAgentCapabilityLines(blueprint).join('\n');
  const constraints = buildAgentConstraintLines(blueprint)
    .map((l) => `- ${l}`)
    .join('\n');
  const done = buildAgentDoneWhen(blueprint)
    .map((l) => `- ${l}`)
    .join('\n');

  return `# ${blueprint.identity.name}

## Mission

${blueprint.purpose.objective}

## Stack

${stack}

## Capabilities

${capabilities}

## Allowed commands

${commands.length > 0 ? commands.join('\n') : '- Ninguno'}

## Testing & Quality

${testingLines}

## Constraints

${constraints}

## Knowledge Sources

${knowledgeLines}

## MCP Integrations

${mcpLines}

## Done when

${done}
`;
}

function buildSkill(blueprint: AgentBlueprint): string {
  return `---
name: ${blueprint.identity.slug}
description: ${JSON.stringify(blueprint.identity.description.replace(/\n/g, ' '))}
---

# ${blueprint.identity.name}

## Cuándo usar esta skill

Úsala cuando el objetivo sea: ${blueprint.purpose.objective}

## Procedimiento

1. Confirma alcance, entradas y criterio de éxito.
2. Reúne contexto sólo desde fuentes aprobadas.
3. Analiza el proyecto según ${describeCatalogSelection(blueprint.project.architecture)}.
4. Propón el cambio o informe mínimo que resuelva el objetivo.
5. Valida con pruebas y controles de seguridad aplicables.
6. Solicita aprobación antes de cualquier acción con efectos.
7. Entrega evidencia, riesgos, limitaciones y próximos pasos.
`;
}

function buildKiroHook(blueprint: AgentBlueprint): Record<string, unknown> {
  return {
    enabled: true,
    name: `${blueprint.identity.name} quality gate`,
    description: 'Solicita una revisión guiada después de modificar archivos relevantes.',
    version: '1',
    when: { type: 'fileEdited', patterns: inferKiroHookPatterns(blueprint.project.technologies) },
    then: {
      type: 'askAgent',
      prompt: `Aplica la skill ${blueprint.identity.slug}, valida el criterio de éxito y no ejecutes acciones con efectos sin aprobación.`,
    },
  };
}

function inferKiroHookPatterns(technologies: string[]): string[] {
  const langPatterns: Record<string, string[]> = {
    typescript: ['src/**/*.{ts,tsx}', 'test/**/*.{ts,tsx}'],
    javascript: ['src/**/*.{js,jsx}', 'test/**/*.{js,jsx}'],
    python: ['src/**/*.py', 'tests/**/*.py'],
    go: ['**/*.go'],
    java: ['src/**/*.java'],
    kotlin: ['src/**/*.{kt,kts}'],
    rust: ['src/**/*.rs'],
    csharp: ['src/**/*.cs'],
    ruby: ['src/**/*.rb', 'spec/**/*.rb'],
    php: ['src/**/*.php'],
    swift: ['Sources/**/*.swift'],
    elixir: ['lib/**/*.ex', 'test/**/*.exs'],
  };
  const patterns: string[] = [];
  for (const tech of technologies) {
    const lang = tech.replace(/^custom:/, '');
    if (langPatterns[lang]) {
      for (const p of langPatterns[lang]) {
        if (!patterns.includes(p)) patterns.push(p);
      }
    }
  }
  return patterns.length > 0 ? patterns : ['src/**/*'];
}

function inferStackGlobs(technologies: string[]): string[] {
  const patterns: string[] = [];
  const langPatterns: Record<string, string[]> = {
    typescript: ['src/**/*.{ts,tsx}', 'test/**/*.{ts,tsx}'],
    javascript: ['src/**/*.{js,jsx}', 'test/**/*.{js,jsx}'],
    python: ['src/**/*.py', 'tests/**/*.py'],
    go: ['**/*.go'],
    java: ['src/**/*.java'],
    kotlin: ['src/**/*.{kt,kts}'],
    rust: ['src/**/*.rs'],
    csharp: ['src/**/*.cs'],
    ruby: ['src/**/*.rb', 'spec/**/*.rb'],
    php: ['src/**/*.php'],
    swift: ['Sources/**/*.swift'],
    elixir: ['lib/**/*.ex', 'test/**/*.exs'],
    cpp: ['src/**/*.cpp'],
    c: ['src/**/*.c'],
  };
  for (const tech of technologies) {
    const lang = tech.replace(/^custom:/, '');
    if (langPatterns[lang]) {
      for (const p of langPatterns[lang]!) {
        if (!patterns.includes(p)) patterns.push(p);
      }
    }
  }
  return patterns.length > 0 ? patterns : ['src/**/*', 'test/**/*'];
}

function buildAllowedCommandLines(blueprint: AgentBlueprint): string[] {
  const commands = buildAllowedCommands(
    blueprint.agent.capabilities,
    blueprint.project.technologies,
    blueprint.testing.tools,
  );
  return commands.map((entry) => `- ${entry.binary}: ${entry.allowed_args.join(', ')}`);
}

function buildAgentContextLines(blueprint: AgentBlueprint): string[] {
  return [
    `Objetivo: ${blueprint.purpose.objective}`,
    `Éxito cuando: ${blueprint.purpose.successCriteria}`,
    `Arquitectura: ${describeCatalogSelection(blueprint.project.architecture)}`,
    `Stack: ${blueprint.project.technologies.map(describeCatalogSelection).join(', ') || 'No especificado'}`,
    `Entorno: ${blueprint.environments.target}`,
    `Autonomía: ${blueprint.agent.autonomy}`,
  ];
}

function buildAgentCapabilityLines(blueprint: AgentBlueprint): string[] {
  const caps = blueprint.agent.capabilities.map((c) => c.replace(/-/g, ' ')).join(', ') || 'Ninguna seleccionada';
  const allowed = buildAllowedCommands(
    blueprint.agent.capabilities,
    blueprint.project.technologies,
    blueprint.testing.tools,
  );
  const binaries = [...new Set(allowed.map((c) => c.binary))].sort().join(', ') || 'ninguno';
  const technologies = blueprint.project.technologies;
  return [
    `- Capacidades: ${caps}`,
    `- Build: ${buildProjectCommand(technologies, 'build')}`,
    `- Test: ${buildProjectCommand(technologies, 'test')}`,
    `- Lint: ${buildProjectCommand(technologies, 'lint')}`,
    `- Comandos shell permitidos: ${binaries}`,
  ];
}

function buildAgentConstraintLines(blueprint: AgentBlueprint): string[] {
  const lines: string[] = [
    'Explicar evidencia, supuestos, riesgos y cambios propuestos antes de actuar',
    'No revelar secretos ni inventar acceso a herramientas o datos',
    'No escribir secretos, tokens ni credenciales en código ni prompts',
    'Priorizar seguridad, mínimo privilegio, observabilidad y rollback',
  ];
  if (blueprint.agent.requireHumanApproval) {
    lines.push('Solicitar aprobación humana antes de acciones con efectos');
  } else {
    lines.push('Trabajar en modo asesor; no ejecutar acciones con efectos');
  }
  if (blueprint.knowledge.enabled) {
    lines.push(`Consultar fuentes: ${blueprint.knowledge.sources.map(describeCatalogSelection).join(', ')}`);
  }
  if (blueprint.prReview.enabled) {
    lines.push(`Revisar PR enfocado en: ${blueprint.prReview.focus.join(', ')}`);
  }
  if (blueprint.purpose.persona) {
    lines.push(`Tono: ${blueprint.purpose.persona}`);
  }
  return lines;
}

function buildAgentDoneWhen(blueprint: AgentBlueprint): string[] {
  const lines = [
    `Criterio de éxito cumplido: ${blueprint.purpose.successCriteria}`,
    'Artefactos copiados respetando rutas del manifest',
    'Hashes SHA-256 del manifest verificados',
    'Agente validado en modo asesor con un caso real',
  ];
  if (
    blueprint.environments.target === 'production' ||
    blueprint.environments.target === 'both' ||
    blueprint.environments.target === 'staging'
  ) {
    lines.push('Probar en staging con observabilidad, rollback y aprobación humana verificados');
    lines.push('Configurar identidad de workload separada y sin credenciales personales');
  }
  return lines;
}

/**
 * Consolidated copy-paste prompt for the agent. It follows the same AI-first
 * template as the target rules and references the other bundle artifacts
 * (blueprint.json, docs/INSTALL.md, docs/WHY.md) instead of duplicating them.
 */
function buildPromptMd(blueprint: AgentBlueprint): string {
  const context = buildAgentContextLines(blueprint)
    .map((l) => `- ${l}`)
    .join('\n');
  const capabilities = buildAgentCapabilityLines(blueprint).join('\n');
  const constraints = buildAgentConstraintLines(blueprint)
    .map((l) => `- ${l}`)
    .join('\n');
  const commands = buildAllowedCommandLines(blueprint);
  const done = buildAgentDoneWhen(blueprint)
    .map((l) => `- ${l}`)
    .join('\n');

  return `# ${blueprint.identity.name}

## Context

${context}

## Capabilities

${capabilities}

## Constraints

${constraints}

## Allowed commands

${commands.length > 0 ? commands.join('\n') : '- Ninguno'}

## Done when

${done}

## Notas

- Usa este prompt junto a blueprint.json, docs/INSTALL.md, docs/WHY.md y los artefactos target seleccionados.
- No reejecutes el generador ni modifiques archivos de configuración sin revisión.
`;
}

function buildAiFirstRuleContent(blueprint: AgentBlueprint): string {
  const context = buildAgentContextLines(blueprint)
    .map((l) => `- ${l}`)
    .join('\n');
  const capabilities = buildAgentCapabilityLines(blueprint).join('\n');
  const constraints = buildAgentConstraintLines(blueprint)
    .map((l) => `- ${l}`)
    .join('\n');
  const commands = buildAllowedCommandLines(blueprint);
  const done = buildAgentDoneWhen(blueprint)
    .map((l) => `- ${l}`)
    .join('\n');

  return `# ${blueprint.identity.name}

## Context

${context}

## Capabilities

${capabilities}

## Constraints

${constraints}

## Allowed commands

${commands.length > 0 ? commands.join('\n') : '- Ninguno'}

## Done when

${done}
`;
}

function buildCursorRules(blueprint: AgentBlueprint): GeneratedArtifact[] {
  const slug = blueprint.identity.slug;
  const globs = inferStackGlobs(blueprint.project.technologies);
  const content = buildAiFirstRuleContent(blueprint);
  const mdcContent = `---
description: ${JSON.stringify(blueprint.identity.description.replace(/\n/g, ' '))}
globs:
${globs.map((g) => `  - "${g}"`).join('\n')}
alwaysApply: false
---

${content}`;
  return [
    makeArtifact(
      `.cursor/rules/${slug}.mdc`,
      'cursor-rules',
      'text/markdown',
      'Regla Cursor con activación por globs para el agente.',
      mdcContent,
    ),
    makeArtifact('.cursorrules', 'cursor-rules', 'text/markdown', 'Regla global consolidada para Cursor.', content),
  ];
}

function buildDevinDesktopRules(blueprint: AgentBlueprint): GeneratedArtifact[] {
  const slug = blueprint.identity.slug;
  const content = buildAiFirstRuleContent(blueprint);
  const windsurfRule = `---
trigger: always_on
description: ${JSON.stringify(blueprint.identity.description.replace(/\n/g, ' '))}
---

${content}`;
  return [
    makeArtifact(
      `.windsurf/rules/${slug}.md`,
      'devin-rules',
      'text/markdown',
      'Regla de Windsurf/Devin Desktop para el agente.',
      windsurfRule,
    ),
    makeArtifact(
      '.windsurfrules',
      'devin-rules',
      'text/markdown',
      'Reglas globales consolidadas para Devin Desktop/Windsurf.',
      content,
    ),
  ];
}

function buildCodeRabbitConfig(blueprint: AgentBlueprint): GeneratedArtifact[] {
  const stackGlobs = inferStackGlobs(blueprint.project.technologies);
  const firstGlob = stackGlobs[0] ?? '**/*';

  const pathFilters = [
    '"!**/package-lock.json"',
    '"!**/yarn.lock"',
    '"!**/pnpm-lock.yaml"',
    '"!**/dist/**"',
    '"!**/.next/**"',
    '"!**/coverage/**"',
    '"!**/*.min.js"',
    '"!**/*.svg"',
    ...stackGlobs.map((g) => `"${g}"`),
  ];

  const pathInstructions: Array<{ path: string; instructions: string }> = [];

  pathInstructions.push({
    path: firstGlob,
    instructions: `Respeta la arquitectura ${describeCatalogSelection(blueprint.project.architecture)}. No incluyas secretos en el código. Ejecuta lint, typecheck y tests antes de aprobar.`,
  });

  const testPatterns = stackGlobs.filter((g) => g.toLowerCase().includes('test'));
  for (const testGlob of testPatterns) {
    pathInstructions.push({
      path: testGlob,
      instructions:
        'Verifica cobertura, determinismo y casos límite. Rechaza tests que dependan de servicios reales o secretos.',
    });
  }

  if (blueprint.devops.compliance.length > 0) {
    pathInstructions.push({
      path: '**/{auth,config,secrets}*',
      instructions:
        'Revisa principio de mínimo privilegio, rotación de secretos y ausencia de credenciales hardcodeadas.',
    });
    pathInstructions.push({
      path: '.env*',
      instructions: 'Verifica que las variables sensibles usen referencias y no se commiteen valores reales.',
    });
  }

  if (blueprint.prReview.enabled) {
    for (const focus of blueprint.prReview.focus) {
      pathInstructions.push({
        path: firstGlob,
        instructions: `Presta atención a ${focus}: documenta hallazgos con evidencia, riesgos y severidad.`,
      });
    }
  }

  const tools: Record<string, { enabled: boolean }> = {
    shellcheck: { enabled: blueprint.project.technologies.includes('bash') },
    markdownlint: { enabled: true },
    'github-checks': { enabled: blueprint.project.repositoryProvider === 'github' },
    'ast-grep': { enabled: false },
  };

  const reviewInstructions = buildAgentConstraintLines(blueprint).join('\n');
  const toneInstructions = blueprint.purpose.persona
    ? `Tono: ${blueprint.purpose.persona}\nSé directo, evidencia primero y sin inventar datos.`
    : 'Sé directo, evidencia primero y sin inventar datos.';

  const yaml = `# CodeRabbit configuration for ${blueprint.identity.name}
# Generated by Artemisa; review before applying.
language: es
tone_instructions: |
${toneInstructions
  .split('\n')
  .map((l) => `  ${l}`)
  .join('\n')}
reviews:
  profile: assertive
  request_changes_workflow: true
  high_level_summary: true
  poem: false
  review_status: true
  collapse_walkthrough: false
  enable_prompt_for_ai_agents: true
  instructions: |
${reviewInstructions
  .split('\n')
  .map((l) => `    ${l}`)
  .join('\n')}
  path_filters:
${pathFilters.map((g) => `    - ${g}`).join('\n')}
  path_instructions:
${pathInstructions
  .map(
    (i) =>
      `    - path: "${i.path}"\n      instructions: |\n${i.instructions
        .split('\n')
        .map((l) => `        ${l}`)
        .join('\n')}`,
  )
  .join('\n')}
  tools:
${Object.entries(tools)
  .map(([name, cfg]) => `    ${name}:\n      enabled: ${cfg.enabled}`)
  .join('\n')}
  auto_review:
    enabled: true
    drafts: false
    base_branches:
      - "main"
      - "development"
  auto_reply:
    enabled: true
chat:
  auto_reply: true
`;
  return [
    makeArtifact(
      '.coderabbit.yaml',
      'coderabbit-config',
      'text/yaml',
      'Configuración de CodeRabbit para revisión async de PRs.',
      yaml,
    ),
  ];
}

function buildKiloCodeRules(blueprint: AgentBlueprint): GeneratedArtifact[] {
  const slug = blueprint.identity.slug;
  const content = buildAiFirstRuleContent(blueprint);
  const modes = [
    {
      id: 'code',
      name: 'Code',
      description: `Desarrollo con ${blueprint.project.technologies.map(describeCatalogSelection).join(', ')}`,
      filePattern: 'src/**/*',
    },
    { id: 'test', name: 'Test', description: 'Diseño y validación de pruebas', filePattern: 'test/**/*' },
    { id: 'review', name: 'Review', description: 'Revisión de código y pull requests', filePattern: 'src/**/*' },
    { id: 'debug', name: 'Debug', description: 'Diagnóstico y corrección de errores', filePattern: 'src/**/*' },
  ];
  const instructions = buildSystemPrompt(blueprint);
  const allowedCommands = buildAllowedCommands(
    blueprint.agent.capabilities,
    blueprint.project.technologies,
    blueprint.testing.tools,
  );
  const canEdit = blueprint.agent.capabilities.includes('edit-code');
  const canCommand = allowedCommands.length > 0;
  const canMcp = blueprint.integrations.mcps.length > 0;
  const kiloModes = {
    version: '1.0.0',
    customModes: modes.map((m) => {
      const groups: Array<string | [string, { fileRegex: string }]> = ['read'];
      if (canEdit && m.id !== 'review') {
        const fileRegex = `^${m.filePattern.replace('/**/*', '/.*')}`;
        groups.push(['edit', { fileRegex }]);
      }
      if (canCommand) groups.push('command');
      if (canMcp) groups.push('mcp');
      return {
        slug: m.id,
        name: m.name,
        description: m.description,
        whenToUse: m.description,
        roleDefinition: blueprint.purpose.objective,
        customInstructions: instructions,
        groups,
      };
    }),
  };
  return [
    makeArtifact(
      `.kilocode/rules/${slug}.md`,
      'kilocode-rules',
      'text/markdown',
      'Regla base de Kilo Code para el agente.',
      content,
    ),
    jsonArtifact('.kilocodemodes', 'kilocode-rules', 'Definición de modos Kilo Code.', kiloModes),
  ];
}

/**
 * Generate one `skills/<skill-id>/SKILL.md` per skill explicitly selected via
 * `skills_selection` (custom focus). The curated profile focuses only steer
 * the UI picker and do not persist a per-skill list, so they produce no
 * artifacts here. Catalog skills are portable and target-agnostic.
 */
function buildCatalogSkillFiles(blueprint: AgentBlueprint): GeneratedArtifact[] {
  return blueprint.skills.items
    .filter((skill) => skill.id !== blueprint.identity.slug)
    .map((skill) =>
      markdownArtifact(
        `skills/${skill.id}/SKILL.md`,
        'instruction',
        `Skill "${skill.name}" seleccionada desde el catálogo.`,
        `---
name: ${skill.id}
description: ${JSON.stringify(skill.name + ' — ' + 'skill del catálogo Artemisa.')}
focus: ${skill.focus}
source: ${skill.sourceUrl}
---

# ${skill.name}

## Cuándo usar esta skill

${skill.name}: úsala cuando el objetivo del agente se alinee con su enfoque (${skill.focus}).

## Procedimiento

1. Confirma que el problema encaja con el enfoque de esta skill.
2. Reúne contexto solo desde fuentes aprobadas por el steering del agente.
3. Aplica el procedimiento propio de la skill respetando el criterio de éxito.
4. Documenta evidencia, supuestos y pasos para reproducir el resultado.
5. Solicita aprobación antes de cualquier acción con efectos.

## Origen

Catálogo curado de Artemisa (versión estática). Fuente: ${skill.sourceUrl}
`,
      ),
    );
}

/**
 * Portable MCP integration manifest listing the servers selected via
 * `mcps_selection`. Replaces the legacy `artemisa/mcps.json` target artifact
 * (removed in #488) with a target-agnostic file consumable by any platform
 * that reads MCP config.
 */
function buildMcpConfig(blueprint: AgentBlueprint): GeneratedArtifact | null {
  if (blueprint.integrations.mcps.length === 0) return null;
  return jsonArtifact(
    'mcp.json',
    'configuration',
    'Manifiesto portable de integraciones MCP seleccionadas para el agente.',
    {
      version: '1.0.0',
      agent: blueprint.identity.slug,
      servers: blueprint.integrations.mcps.map((mcp) => ({
        id: mcp.id,
        name: mcp.name,
        category: mcp.category,
        sourceUrl: mcp.sourceUrl,
      })),
    },
  );
}

function buildTargetArtifacts(target: string, blueprint: AgentBlueprint): GeneratedArtifact[] {
  switch (target) {
    case 'agents-md':
      return [markdownArtifact('AGENTS.md', 'agents-md', 'AGENTS.md universal enriquecido.', buildAgentsMd(blueprint))];
    case 'portable':
      return [
        markdownArtifact(
          `skills/${blueprint.identity.slug}/SKILL.md`,
          'instruction',
          'Skill portable con el procedimiento principal.',
          buildSkill(blueprint),
        ),
      ];
    case 'kiro':
      return [
        markdownArtifact(
          `.kiro/steering/${blueprint.identity.slug}.md`,
          'instruction',
          'Steering del proyecto para Kiro.',
          buildAiFirstRuleContent(blueprint),
        ),
        ...(blueprint.features.skills
          ? [
              markdownArtifact(
                `.kiro/skills/${blueprint.identity.slug}/SKILL.md`,
                'instruction',
                'Skill de Kiro para el procedimiento generado.',
                buildSkill(blueprint),
              ),
            ]
          : []),
        ...(blueprint.features.hooks
          ? [
              jsonArtifact(
                `.kiro/hooks/${blueprint.identity.slug}-quality.json`,
                'configuration',
                'Hook Kiro revisable para quality gate.',
                buildKiroHook(blueprint),
              ),
            ]
          : []),
      ];
    case 'cursor':
      return buildCursorRules(blueprint);
    case 'devin-desktop':
      return buildDevinDesktopRules(blueprint);
    case 'coderabbit':
      return buildCodeRabbitConfig(blueprint);
    case 'kilo-code':
      return buildKiloCodeRules(blueprint);
    default:
      return [];
  }
}

function buildApplicationGuide(blueprint: AgentBlueprint): GeneratedAgentBundle['applicationGuide'] {
  const production = blueprint.environments.target === 'production' || blueprint.environments.target === 'both';
  const steps = [
    `Descarga o copia los artefactos respetando las rutas del manifest (${blueprint.agent.targets.join(', ')}).`,
    'Revisa blueprint.json y docs/WHY.md con el equipo responsable.',
    'Configura referencias de secretos e integraciones con mínimo privilegio.',
    'Valida el agente en modo asesor con un repositorio o entorno de prueba.',
    'Activa únicamente las capacidades verificadas y documenta cualquier override.',
  ];
  const productionChecklist = production
    ? [
        'Usar una identidad de workload separada y sin credenciales personales.',
        'Probar en staging, configurar observabilidad y verificar alertas.',
        'Definir timeout, rate limit, presupuesto, backup y rollback.',
        'Exigir aprobación humana para deploy y acciones operacionales.',
        'Registrar auditoría de entradas, decisiones y herramientas invocadas.',
      ]
    : [];
  return {
    summary: `Aplicación guiada de ${blueprint.identity.name} para ${blueprint.environments.target}.`,
    steps,
    productionChecklist,
  };
}

export function generateAgentBundle(input: unknown): GeneratedAgentBundle {
  const evaluation = evaluateDecisionTree(input);
  const blueprint = buildBlueprint(evaluation.answers, evaluation);
  const artifacts: GeneratedArtifact[] = [];
  const paths = new Set<string>();
  const add = (artifact: GeneratedArtifact) => {
    if (paths.has(artifact.path))
      throw new CreatorInputError(
        'Ruta de artefacto duplicada.',
        [{ path: artifact.path, message: 'Cada archivo debe ser único.' }],
        422,
      );
    paths.add(artifact.path);
    artifacts.push(artifact);
  };

  add(
    jsonArtifact(
      'blueprint.json',
      'configuration',
      'Blueprint canónico con todas las decisiones del agente.',
      blueprint,
    ),
  );
  add(
    markdownArtifact(
      'docs/INSTALL.md',
      'documentation',
      'Tutorial para aplicar el bundle de forma segura.',
      buildInstall(blueprint),
    ),
  );
  add(
    markdownArtifact(
      'docs/WHY.md',
      'documentation',
      'Explicación de decisiones, recomendaciones y trade-offs.',
      buildWhy(blueprint),
    ),
  );
  add(
    markdownArtifact(
      'PROMPT.md',
      'instruction',
      'Prompt consolidado para copiar y enviar al agente con todo el contexto del bundle.',
      buildPromptMd(blueprint),
    ),
  );

  // Target-specific artifacts are generated by buildTargetArtifacts below.

  for (const target of blueprint.agent.targets) {
    for (const artifact of buildTargetArtifacts(target, blueprint)) {
      add(artifact);
    }
  }

  // Catalog skills (portable, target-agnostic) selected via `skills_selection`.
  for (const artifact of buildCatalogSkillFiles(blueprint)) {
    add(artifact);
  }

  // Portable MCP manifest selected via `mcps_selection`.
  const mcpConfig = buildMcpConfig(blueprint);
  if (mcpConfig) add(mcpConfig);

  // Target-specific generation is centralized in buildTargetArtifacts.

  const applicationGuide = buildApplicationGuide(blueprint);
  const warnings = [...evaluation.warnings];
  if (blueprint.agent.targets.includes('coderabbit') && blueprint.project.repositoryProvider !== 'github')
    warnings.push('CodeRabbit: el proveedor de repositorio no es GitHub; verifica compatibilidad de integración.');
  if (blueprint.environments.target !== 'development')
    warnings.push(
      'El preview no despliega el agente: producción requiere staging, identidad separada, observabilidad y rollback verificados.',
    );
  if (artifacts.length > 40 || artifacts.reduce((sum, artifact) => sum + artifact.content.length, 0) > 256_000) {
    throw new CreatorInputError(
      'El bundle supera los límites seguros de preview.',
      [{ path: 'artifacts', message: 'Máximo 40 archivos y 256 KB de contenido.' }],
      422,
    );
  }

  const manifest = {
    agent: blueprint.identity.slug,
    artifactCount: artifacts.length + 1,
    targets: blueprint.agent.targets,
    files: artifacts.map((artifact) => ({ path: artifact.path, sha256: artifact.sha256, kind: artifact.kind })),
  };
  add(jsonArtifact('manifest.json', 'manifest', 'Índice verificable de los archivos generados.', manifest));

  return {
    generatorVersion: GENERATOR_VERSION,
    blueprint,
    artifacts,
    manifest,
    applicationGuide,
    warnings,
  };
}
