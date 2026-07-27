import {
  AnswerIssue,
  CreatorAnswers,
  CreatorAnswerValue,
  CreatorInputError,
  CreatorRecommendation,
  DecisionEvaluation,
  DecisionQuestion,
  QuestionCondition,
  QuestionOption,
} from './domain.js';
import { CATALOG_VERSION, getCatalogItem, isCatalogItemFor } from './catalog.js';

export const WORKFLOW_VERSION = '1.0.0';

const option = (id: string, label: string, description: string): QuestionOption => ({ id, label, description });

/**
 * Canonical question field IDs for the Creator workflow.
 * The exact IDs and their order are documented in /api/v1/creator/workflow.
 * Do not rely on the README for field names — use the API endpoint as the
 * single source of truth for question identifiers and branching logic.
 */
export const creatorQuestions: DecisionQuestion[] = [
  {
    id: 'agent_name',
    section: 'Identidad',
    prompt: '¿Cómo se llamará el agente?',
    description: 'Un nombre corto permite identificar archivos, skills y documentación.',
    type: 'text',
    required: true,
    placeholder: 'Ej: reviewer-plataforma',
  },
  {
    id: 'purpose',
    section: 'Objetivo',
    prompt: '¿Qué problema principal resolverá?',
    description: 'La finalidad abre ramas y recomendaciones especializadas.',
    type: 'select',
    required: true,
    options: [
      option('pr-review', 'Revisión de pull requests', 'Analiza cambios, riesgos y estándares antes de integrar.'),
      option('coding', 'Desarrollo y mantenimiento', 'Ayuda a implementar, refactorizar y corregir código.'),
      option('testing', 'Pruebas y calidad', 'Diseña pruebas, quality gates y validaciones.'),
      option('devops', 'DevOps y plataforma', 'Automatiza CI/CD, infraestructura y operación.'),
      option('operations', 'Operación de producción', 'Diagnóstico, observabilidad y respuesta guiada.'),
      option('security', 'Seguridad', 'Revisa código, dependencias, configuración y amenazas.'),
      option('data-ai', 'Datos e IA', 'Pipelines, modelos, RAG y calidad de datos.'),
      option('documentation', 'Documentación', 'Mantiene documentación técnica y runbooks.'),
      option('machine-learning', 'Machine Learning', 'Entrenamiento, evaluación y serving de modelos.'),
      option('data-engineering', 'Ingeniería de datos', 'Pipelines ETL/ELT, calidad y gobierno de datos.'),
      option('cybersecurity-offensive', 'Seguridad ofensiva', 'Pentesting, análisis de vulnerabilidades y red team.'),
      option('cybersecurity-defensive', 'Seguridad defensiva', 'SIEM, detección de amenazas y blue team.'),
      option('blockchain-dev', 'Blockchain/Web3', 'Smart contracts, protocolos y dApps.'),
      option('networking', 'Redes y sistemas', 'Administración de redes, SDN y conectividad.'),
      option('embedded-systems', 'Sistemas embebidos', 'Firmware, IoT y bajo nivel.'),
      option('research', 'Investigación', 'Exploración, prototipado y experimentación.'),
      option('custom', 'Otro propósito', 'Conserva un objetivo personalizado.'),
    ],
  },
  {
    id: 'objective',
    section: 'Objetivo',
    prompt: 'Describe el resultado que esperas del agente',
    description: 'Explica entradas, resultado y límites; no incluyas credenciales.',
    type: 'textarea',
    required: true,
    placeholder: 'Ej: revisar cada PR, explicar riesgos y proponer cambios sin hacer merge automático.',
  },
  {
    id: 'success_criteria',
    section: 'Objetivo',
    prompt: '¿Cómo sabrás que funciona correctamente?',
    description: 'Define un criterio verificable para validar el agente.',
    type: 'textarea',
    required: true,
    placeholder: 'Ej: cada PR recibe un informe priorizado y no se publican falsos positivos críticos.',
  },
  {
    id: 'agent_persona',
    section: 'Objetivo',
    prompt: '¿Tiene un estilo, tono o restricción particular?',
    description: 'Opcional. Se agrega tal cual al system prompt generado — tono de escritura, tabúes, formalidad, etc.',
    type: 'textarea',
    required: false,
    placeholder: 'Ej: tono directo y sin rodeos, evita jerga de marketing, siempre cita la línea exacta del código.',
  },
  {
    id: 'project_stage',
    section: 'Proyecto',
    prompt: '¿En qué estado está el proyecto?',
    description: 'Un proyecto existente prioriza compatibilidad; uno nuevo permite sugerencias estructurales.',
    type: 'select',
    required: true,
    options: [
      option('new', 'Proyecto nuevo', 'Se diseñará una base coherente desde cero.'),
      option('existing', 'Proyecto existente', 'Se respetará la arquitectura y convenciones actuales.'),
      option('migration', 'Migración', 'Se documentarán estados origen, destino y convivencia.'),
      option('other', 'Otro (especificar)', 'Se adaptará el enfoque al contexto descrito por el usuario.'),
    ],
  },
  {
    id: 'technologies',
    section: 'Stack',
    prompt: 'Selecciona las tecnologías del proyecto',
    description: 'Puedes combinar lenguajes, frameworks, datos y añadir `custom:<slug>`.',
    type: 'catalog-multiselect',
    required: true,
    catalogCategories: ['language', 'frontend', 'backend', 'mobile', 'data-ai', 'database'],
    maxSelections: 24,
  },
  {
    id: 'architecture',
    section: 'Arquitectura',
    prompt: '¿Qué arquitectura describe mejor la aplicación?',
    description: 'La recomendación se ajustará a tamaño de equipo, despliegue y operación.',
    type: 'catalog-select',
    required: true,
    catalogCategories: ['architecture'],
  },
  {
    id: 'repository_provider',
    section: 'Proyecto',
    prompt: '¿Dónde vive el código?',
    description: 'Define integraciones de PR, tickets y CI.',
    type: 'catalog-select',
    required: true,
    catalogCategories: ['repository'],
  },
  {
    id: 'environment',
    section: 'Entornos',
    prompt: '¿Dónde trabajará el agente?',
    description: 'Desarrollo y producción tienen permisos, riesgos y artefactos diferentes.',
    type: 'select',
    required: true,
    options: [
      option('development', 'Sólo desarrollo', 'Opera sobre código y herramientas de desarrollo.'),
      option('production', 'Sólo producción', 'Asiste en un entorno operacional controlado.'),
      option('both', 'Desarrollo y producción', 'Genera políticas separadas para ambos contextos.'),
      option('testing', 'Testing / QA', 'Entorno de pruebas con datos sintéticos y validación automatizada.'),
      option('staging', 'Staging / Pre-producción', 'Réplica de producción para validación final antes del release.'),
      option('local', 'Local / Recreativo', 'Entorno personal de experimentación sin impacto externo.'),
    ],
  },
  {
    id: 'development_setup',
    section: 'Entorno de desarrollo',
    prompt: '¿Cómo se prepara el entorno de desarrollo?',
    description: 'Permite generar pasos de instalación reproducibles.',
    type: 'select',
    required: true,
    visibleWhen: { operator: 'oneOf', questionId: 'environment', values: ['development', 'both', 'local'] },
    options: [
      option('local', 'Local', 'Dependencias instaladas en la estación del desarrollador.'),
      option('docker-compose', 'Docker Compose', 'Servicios locales reproducibles mediante contenedores.'),
      option('devcontainer', 'Dev Container', 'Entorno de editor y toolchain en contenedor.'),
      option('remote', 'Entorno remoto', 'Workspace de desarrollo alojado en servidor o cloud.'),
    ],
  },
  {
    id: 'testing_tools',
    section: 'Pruebas',
    prompt: '¿Qué herramientas de prueba y calidad utiliza el proyecto?',
    description: 'Selecciona las prácticas de validación activas o deseadas.',
    type: 'catalog-multiselect',
    required: false,
    catalogCategories: ['testing'],
    maxSelections: 6,
    visibleWhen: { operator: 'oneOf', questionId: 'environment', values: ['development', 'both', 'local'] },
  },
  {
    id: 'deployment_target',
    section: 'Producción',
    prompt: '¿Dónde se ejecuta la aplicación o el agente?',
    description: 'Selecciona EC2, contenedores, Kubernetes, serverless o hosting administrado.',
    type: 'catalog-select',
    required: true,
    catalogCategories: ['cloud'],
    visibleWhen: { operator: 'oneOf', questionId: 'environment', values: ['production', 'both', 'testing', 'staging'] },
  },
  {
    id: 'container_platforms',
    section: 'Producción',
    prompt: '¿Qué capa de empaquetado u orquestación utilizas?',
    description: 'Es opcional para serverless o plataformas totalmente administradas.',
    type: 'catalog-multiselect',
    required: false,
    catalogCategories: ['container'],
    maxSelections: 5,
    visibleWhen: { operator: 'oneOf', questionId: 'environment', values: ['production', 'both', 'testing', 'staging'] },
  },
  {
    id: 'ci_cd',
    section: 'DevOps',
    prompt: '¿Qué plataformas de CI/CD utilizarás?',
    description: 'El agente documentará quality gates y promoción sin desplegar automáticamente.',
    type: 'catalog-multiselect',
    required: true,
    catalogCategories: ['cicd'],
    maxSelections: 4,
  },
  {
    id: 'infrastructure',
    section: 'DevOps',
    prompt: '¿Cómo se define la infraestructura?',
    description: 'Selecciona IaC y automatización aplicable.',
    type: 'catalog-multiselect',
    required: false,
    catalogCategories: ['infrastructure'],
    maxSelections: 5,
    visibleWhen: { operator: 'oneOf', questionId: 'environment', values: ['production', 'both', 'testing', 'staging'] },
  },
  {
    id: 'observability',
    section: 'Producción',
    prompt: '¿Qué observabilidad necesita?',
    description: 'Producción debe cubrir errores, logs, métricas y trazas según riesgo.',
    type: 'catalog-multiselect',
    required: true,
    catalogCategories: ['observability'],
    maxSelections: 6,
    visibleWhen: { operator: 'oneOf', questionId: 'environment', values: ['production', 'both', 'testing', 'staging'] },
  },
  {
    id: 'security_controls',
    section: 'Seguridad',
    prompt: 'Selecciona controles de seguridad y supply chain',
    description: 'Los secretos deben referenciarse por nombre; nunca se incluyen valores.',
    type: 'catalog-multiselect',
    required: true,
    catalogCategories: ['security'],
    maxSelections: 8,
  },
  {
    id: 'capabilities',
    section: 'Permisos',
    prompt: '¿Qué capacidades necesita el agente?',
    description: 'Concede sólo lo necesario. Producción no habilita escritura o despliegue por defecto.',
    type: 'multiselect',
    required: true,
    maxSelections: 16,
    options: [
      option('read-repository', 'Leer repositorio', 'Analiza código y documentación.'),
      option('edit-code', 'Proponer cambios', 'Genera parches, sin aplicarlos automáticamente.'),
      option('run-tests', 'Ejecutar pruebas', 'Ejecuta comandos de calidad allowlisted.'),
      option('review-pr', 'Revisar PR', 'Lee diffs y publica o prepara comentarios.'),
      option('manage-issues', 'Gestionar issues', 'Lee o actualiza trabajo planificado.'),
      option('inspect-infrastructure', 'Inspeccionar infraestructura', 'Consulta estado operacional en modo lectura.'),
      option('operate-production', 'Operar producción', 'Acciones operacionales con aprobación obligatoria.'),
      option('deploy', 'Desplegar', 'Promoción controlada con aprobación y rollback.'),
      option('analyze-data', 'Analizar datos', 'Lee datasets, genera visualizaciones y reportes.'),
      option('train-models', 'Entrenar modelos', 'Ejecuta pipelines de entrenamiento ML.'),
      option('scan-vulnerabilities', 'Escanear vulnerabilidades', 'Ejecuta herramientas de seguridad.'),
      option('pentest', 'Pentesting guiado', 'Ejecuta pruebas de intrusión controladas.'),
      option('manage-network', 'Gestionar red', 'Configura y monitoriza infraestructura de red.'),
      option('automate-workflows', 'Automatizar workflows', 'Crea y ejecuta pipelines de automatización.'),
      option('audit-compliance', 'Auditar cumplimiento', 'Verifica políticas y estándares.'),
      option('generate-reports', 'Generar reportes', 'Produce documentación y dashboards.'),
    ],
  },
  {
    id: 'autonomy',
    section: 'Permisos',
    prompt: '¿Qué nivel de autonomía tendrá?',
    description: 'El modo asesor es el valor más seguro; los otros requieren controles adicionales.',
    type: 'select',
    required: true,
    options: [
      option('advisory', 'Asesor', 'Sólo analiza y recomienda.'),
      option('assisted', 'Asistido', 'Prepara acciones que una persona aprueba.'),
      option('autonomous', 'Autónomo acotado', 'Ejecuta únicamente operaciones allowlisted y reversibles.'),
    ],
  },
  {
    id: 'human_approval',
    section: 'Permisos',
    prompt: '¿Exigir aprobación humana para acciones con efectos?',
    description: 'Obligatorio para producción, escritura, deploy y privilegios elevados.',
    type: 'boolean',
    required: true,
    visibleWhen: {
      operator: 'any',
      conditions: [
        { operator: 'oneOf', questionId: 'autonomy', values: ['assisted', 'autonomous'] },
        { operator: 'includes', questionId: 'capabilities', value: 'operate-production' },
        { operator: 'includes', questionId: 'capabilities', value: 'deploy' },
      ],
    },
  },
  {
    id: 'knowledge_enabled',
    section: 'Conocimiento',
    prompt: '¿Necesita conocimiento adicional al prompt?',
    description: 'Activa RAG o instrucciones versionadas cuando el contexto no cabe en una regla breve.',
    type: 'boolean',
    required: true,
  },
  {
    id: 'knowledge_sources',
    section: 'Conocimiento',
    prompt: '¿Qué fuentes utilizará?',
    description: 'El preview sólo documenta fuentes; no lee archivos ni URLs.',
    type: 'catalog-multiselect',
    required: true,
    catalogCategories: ['knowledge'],
    maxSelections: 8,
    visibleWhen: { operator: 'equals', questionId: 'knowledge_enabled', value: true },
  },
  {
    id: 'pr_review_enabled',
    section: 'Pull requests',
    prompt: '¿Debe incluir una configuración especializada de PR review?',
    description: 'Genera rúbrica, severidades y permisos; nunca activa auto-merge.',
    type: 'boolean',
    required: true,
  },
  {
    id: 'pr_review_focus',
    section: 'Pull requests',
    prompt: '¿Qué debe priorizar en los PR?',
    description: 'El informe explicará evidencia, severidad y corrección sugerida.',
    type: 'multiselect',
    required: true,
    maxSelections: 7,
    options: [
      option('correctness', 'Correctitud', 'Bugs, estados inválidos y regresiones.'),
      option('security', 'Seguridad', 'Entradas, permisos, secretos y supply chain.'),
      option('performance', 'Rendimiento', 'Complejidad, consultas y uso de recursos.'),
      option('architecture', 'Arquitectura', 'Límites, dependencias y mantenibilidad.'),
      option('tests', 'Pruebas', 'Cobertura de comportamiento y casos de borde.'),
      option('devops', 'DevOps', 'Pipelines, contenedores, IaC y observabilidad.'),
      option('documentation', 'Documentación', 'Contratos, cambios y operación.'),
    ],
    visibleWhen: { operator: 'equals', questionId: 'pr_review_enabled', value: true },
  },
  {
    id: 'agent_targets',
    section: 'Salida',
    prompt: '¿Para qué plataformas se generará la configuración?',
    description:
      'Selecciona uno o más targets reales. Puedes generar artefactos nativos para varias plataformas simultáneamente.',
    type: 'catalog-multiselect',
    required: true,
    catalogCategories: ['agent-platform'],
    maxSelections: 7,
  },
  {
    id: 'hooks_enabled',
    section: 'Salida',
    prompt: '¿Generar políticas y hooks recomendados?',
    description: 'Los hooks generados son plantillas revisables y no se ejecutan durante el preview.',
    type: 'boolean',
    required: true,
  },
  {
    id: 'skills_enabled',
    section: 'Salida',
    prompt: '¿Generar skills reutilizables?',
    description: 'Convierte el procedimiento principal en una habilidad documentada.',
    type: 'boolean',
    required: true,
  },
  {
    id: 'skills_focus',
    section: 'Salida',
    prompt: '¿Qué enfoque deben tener las skills?',
    description: 'Cada perfil preselecciona skills recomendadas del catálogo; personalizado abre el buscador completo.',
    type: 'select',
    required: true,
    options: [
      option('development', 'Desarrollo', 'Scaffolding, refactor, debugging y convenciones de código.'),
      option('security', 'Seguridad', 'Revisión de secretos, dependencias y hardening.'),
      option('data-ai', 'Datos e IA', 'RAG, pipelines de datos y evaluación de modelos.'),
      option('operations', 'Operaciones', 'Runbooks, observabilidad y respuesta a incidentes.'),
      option('documentation', 'Documentación', 'Guías, changelogs y referencias de API.'),
      option('custom', 'Personalizado', 'Elige cada skill manualmente desde el buscador completo.'),
    ],
    visibleWhen: { operator: 'equals', questionId: 'skills_enabled', value: true },
  },
  {
    id: 'skills_selection',
    section: 'Salida',
    prompt: 'Selecciona las skills específicas',
    description: 'Buscador completo de skills disponibles.',
    type: 'custom',
    required: true,
    catalogCategories: ['skill'],
    visibleWhen: { operator: 'equals', questionId: 'skills_focus', value: 'custom' },
  },
  {
    id: 'mcps_enabled',
    section: 'Salida',
    prompt: '¿Habilitar integraciones MCP?',
    description: 'Permite al agente comunicarse con servidores MCP (Model Context Protocol).',
    type: 'boolean',
    required: true,
  },
  {
    id: 'mcps_selection',
    section: 'Salida',
    prompt: 'Selecciona los servidores MCP',
    description: 'Buscador de integraciones disponibles para el agente.',
    type: 'custom',
    required: true,
    catalogCategories: ['mcp'],
    visibleWhen: { operator: 'equals', questionId: 'mcps_enabled', value: true },
  },
];

export const creatorTutorial = {
  version: '1.0.0',
  skippable: true,
  title: 'Rescate de una API ficticia en producción',
  description:
    'Tutorial tipo juego para aprender a separar objetivo, contexto, permisos y operación antes de crear un agente real.',
  stages: [
    {
      id: 'incident',
      title: 'La alerta',
      narrative: 'Una API ficticia presenta errores después de un despliegue.',
      learning: 'Define un resultado verificable antes de elegir herramientas.',
    },
    {
      id: 'context',
      title: 'El mapa',
      narrative: 'Elige stack, arquitectura y fuentes de conocimiento.',
      learning: 'Distingue reglas estables, documentación y datos vivos.',
    },
    {
      id: 'permissions',
      title: 'La llave',
      narrative: 'Concede permisos mínimos y decide qué requiere aprobación.',
      learning: 'Un agente no debe ser su propia autoridad.',
    },
    {
      id: 'delivery',
      title: 'La salida',
      narrative: 'Compara artefactos Artemisa, Kiro y portables.',
      learning: 'Cada decisión queda explicada y es reversible.',
    },
  ],
  completion: 'Al terminar o saltar el tutorial, la UI debe abrir el creador guiado sin modificar estado del backend.',
};

function conditionMatches(condition: QuestionCondition, answers: CreatorAnswers): boolean {
  switch (condition.operator) {
    case 'equals':
      return answers[condition.questionId] === condition.value;
    case 'oneOf':
      return condition.values.some((value) => answers[condition.questionId] === value);
    case 'includes': {
      const answer = answers[condition.questionId];
      return Array.isArray(answer) && answer.includes(condition.value);
    }
    case 'all':
      return condition.conditions.every((item) => conditionMatches(item, answers));
    case 'any':
      return condition.conditions.some((item) => conditionMatches(item, answers));
  }
}

function isAnswered(_question: DecisionQuestion, value: CreatorAnswerValue | undefined): boolean {
  if (value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'boolean') return true;
  return value.length > 0;
}

function validateQuestionAnswer(question: DecisionQuestion, value: CreatorAnswerValue): AnswerIssue[] {
  const issues: AnswerIssue[] = [];
  const path = `answers.${question.id}`;
  if (question.type === 'text' || question.type === 'textarea') {
    if (typeof value !== 'string') return [{ path, message: 'Debe ser un texto.' }];
    const max = question.type === 'textarea' ? 4000 : 120;
    if (value.trim().length === 0 || value.length > max)
      issues.push({ path, message: `Debe contener entre 1 y ${max} caracteres.` });
    return issues;
  }
  if (question.type === 'boolean') {
    if (typeof value !== 'boolean') issues.push({ path, message: 'Debe ser true o false.' });
    return issues;
  }
  if (question.type === 'select') {
    if (typeof value !== 'string' || !question.options?.some((item) => item.id === value))
      issues.push({ path, message: 'La opción no pertenece a esta pregunta.' });
    return issues;
  }
  if (question.type === 'catalog-select') {
    if (typeof value !== 'string' || !isCatalogItemFor(value, question.catalogCategories ?? []))
      issues.push({ path, message: 'La tecnología seleccionada no pertenece a la categoría esperada.' });
    return issues;
  }
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string'))
    return [{ path, message: 'Debe ser una lista de identificadores.' }];
  if (value.length > (question.maxSelections ?? 20))
    issues.push({ path, message: `Supera el máximo de ${question.maxSelections ?? 20} selecciones.` });
  if (new Set(value).size !== value.length) issues.push({ path, message: 'No se permiten selecciones duplicadas.' });
  if (question.type === 'multiselect') {
    const allowed = new Set(question.options?.map((item) => item.id));
    if (value.some((item) => !allowed.has(item)))
      issues.push({ path, message: 'La lista contiene una opción desconocida.' });
  } else if (value.some((item) => !isCatalogItemFor(item, question.catalogCategories ?? []))) {
    issues.push({ path, message: 'La lista contiene una tecnología fuera de la categoría esperada.' });
  }
  return issues;
}

function parseCreatorAnswers(input: unknown): {
  answers: CreatorAnswers;
  issues: AnswerIssue[];
  warnings: string[];
} {
  if (input === undefined) return { answers: {}, issues: [], warnings: [] };
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new CreatorInputError('answers debe ser un objeto.', [
      { path: 'answers', message: 'Se esperaba un objeto JSON.' },
    ]);
  }
  const known = new Map(creatorQuestions.map((question) => [question.id, question]));
  const answers: CreatorAnswers = {};
  const issues: AnswerIssue[] = [];
  const warnings: string[] = [];
  for (const [key, raw] of Object.entries(input)) {
    const question = known.get(key);
    if (!question) {
      warnings.push(`La respuesta "${key}" no pertenece a la versión ${WORKFLOW_VERSION} y fue ignorada.`);
      continue;
    }
    if (
      typeof raw !== 'string' &&
      typeof raw !== 'boolean' &&
      !(Array.isArray(raw) && raw.every((item) => typeof item === 'string'))
    ) {
      issues.push({ path: `answers.${key}`, message: 'Tipo de dato no permitido.' });
      continue;
    }
    const value = Array.isArray(raw) ? raw.slice(0, 50) : raw;
    answers[key] = value as CreatorAnswers[string];
    issues.push(...validateQuestionAnswer(question, value as CreatorAnswers[string]));
  }
  return { answers, issues, warnings };
}

function recommendation(
  id: string,
  severity: CreatorRecommendation['severity'],
  title: string,
  reason: string,
  evidence: string[],
  benefits: string[],
  tradeoffs: string[],
  alternatives: string[],
): CreatorRecommendation {
  return { id, severity, title, reason, evidence, benefits, tradeoffs, alternatives };
}

function buildRecommendations(answers: CreatorAnswers): CreatorRecommendation[] {
  const result: CreatorRecommendation[] = [];
  const environment = answers.environment;
  const technologies = Array.isArray(answers.technologies) ? answers.technologies : [];
  const architecture = answers.architecture;
  const deployment = answers.deployment_target;
  const targets = Array.isArray(answers.agent_targets) ? answers.agent_targets : [];
  const purpose = answers.purpose;

  // Domain-specific recommendations based on purpose
  if (purpose === 'machine-learning') {
    result.push(
      recommendation(
        'ml-experiment-tracking',
        'recommended',
        'Implementar experiment tracking y versionado de modelos',
        'Un proyecto de ML necesita registrar hiperparámetros, métricas, artefactos y linaje de datos para garantizar reproducibilidad y comparabilidad entre experimentos.',
        ['purpose=machine-learning'],
        ['Reproducibilidad de resultados', 'Comparación sistemática de modelos', 'Auditoría de decisiones'],
        ['Infraestructura adicional de tracking', 'Disciplina de registro en equipo'],
        ['Versionado manual con Git tags y archivos de configuración'],
      ),
    );
    result.push(
      recommendation(
        'ml-reproducibility',
        'recommended',
        'Garantizar reproducibilidad con seeds, pinning y pipelines declarativos',
        'Modelos no reproducibles impiden debugging, auditoría y validación. Fijar seeds, versiones de dependencias y datos de entrada asegura que el mismo código produce los mismos resultados.',
        ['purpose=machine-learning'],
        ['Debugging efectivo', 'Validación por terceros', 'Compliance regulatorio'],
        ['Overhead de versionado de datasets grandes', 'Mayor tiempo de setup'],
        ['Documentar configuración sin automatización'],
      ),
    );
  }
  if (purpose === 'cybersecurity-offensive') {
    result.push(
      recommendation(
        'offensive-scope-authorization',
        'warning',
        'Definir alcance, autorización y cadena de evidencia antes de ejecutar',
        'Pentesting sin autorización explícita y alcance documentado es ilegal. Cada prueba debe tener permiso escrito, scope definido, ventana temporal y procedimiento de reporting.',
        ['purpose=cybersecurity-offensive'],
        ['Protección legal', 'Resultados válidos y accionables', 'Trazabilidad completa'],
        ['Tiempo de preparación y aprobación', 'Restricción del alcance'],
        ['Bug bounty con scope público', 'Evaluación de seguridad automatizada con herramientas passivas'],
      ),
    );
    result.push(
      recommendation(
        'offensive-evidence-chain',
        'recommended',
        'Mantener cadena de custodia y evidencia reproducible',
        'Los hallazgos de seguridad pierden valor si no pueden reproducirse y verificarse. Cada vulnerabilidad necesita PoC, impacto y pasos exactos.',
        ['purpose=cybersecurity-offensive'],
        ['Credibilidad de hallazgos', 'Priorización de remediación', 'Validación de fixes'],
        ['Tiempo extra de documentación', 'Almacenamiento seguro de evidencia'],
        ['Escáneres automáticos con reporting integrado'],
      ),
    );
  }
  if (purpose === 'cybersecurity-defensive') {
    result.push(
      recommendation(
        'defensive-siem-integration',
        'recommended',
        'Integrar SIEM con triage automatizado y respuesta a incidentes',
        'Un SOC efectivo necesita correlación de eventos, reglas de detección, priorización automática y playbooks de respuesta documentados.',
        ['purpose=cybersecurity-defensive'],
        ['Detección temprana', 'Reducción de tiempo de respuesta', 'Priorización objetiva'],
        ['Volumen de alertas y falsos positivos', 'Inversión en infraestructura y reglas'],
        ['Alertas manuales por servicio', 'Monitoreo de logs sin correlación'],
      ),
    );
    result.push(
      recommendation(
        'defensive-incident-response',
        'recommended',
        'Documentar playbooks de respuesta y realizar simulacros',
        'Sin procedimientos probados, los incidentes escalan por improvisación. Los playbooks reducen MTTR y los simulacros validan la capacidad del equipo.',
        ['purpose=cybersecurity-defensive'],
        ['Respuesta consistente', 'Menor tiempo de recuperación', 'Aprendizaje de incidentes'],
        ['Mantenimiento de playbooks', 'Tiempo dedicado a simulacros'],
        ['Post-mortems reactivos sin playbooks previos'],
      ),
    );
  }
  if (purpose === 'data-engineering') {
    result.push(
      recommendation(
        'data-quality-lineage',
        'recommended',
        'Implementar calidad de datos, schema registry y linaje',
        'Pipelines sin validación de calidad propagan errores silenciosamente. Schema registry previene roturas por cambios incompatibles y el linaje permite debugging.',
        ['purpose=data-engineering'],
        ['Detección temprana de errores', 'Compatibilidad entre productores y consumidores', 'Trazabilidad'],
        ['Infraestructura adicional', 'Governance y ownership de schemas'],
        ['Validación manual en cada step', 'Tests de integración end-to-end'],
      ),
    );
    result.push(
      recommendation(
        'data-idempotency',
        'recommended',
        'Garantizar idempotencia y reintentos seguros en pipelines',
        'Los pipelines de datos fallan. Si las transformaciones no son idempotentes, los reintentos producen duplicados o corrupción.',
        ['purpose=data-engineering'],
        ['Reintentos seguros', 'Recuperación automática', 'Consistencia de datos'],
        ['Diseño más complejo', 'Necesidad de claves de deduplicación'],
        ['Pipelines manuales con verificación post-ejecución'],
      ),
    );
  }
  if (purpose === 'blockchain-dev') {
    result.push(
      recommendation(
        'blockchain-formal-verification',
        'recommended',
        'Aplicar verificación formal y auditorías de seguridad a smart contracts',
        'Los smart contracts son inmutables una vez desplegados. Errores en contratos manejan fondos reales y no pueden parchearse sin migración. La verificación formal y auditorías externas son críticas.',
        ['purpose=blockchain-dev'],
        ['Prevención de exploits', 'Confianza de usuarios', 'Conformidad regulatoria'],
        ['Costo y tiempo de auditorías', 'Curva de aprendizaje de verificación formal'],
        ['Testing extensivo con fuzzing', 'Bug bounty post-deploy'],
      ),
    );
    result.push(
      recommendation(
        'blockchain-gas-optimization',
        'recommended',
        'Optimizar gas y costos de ejecución on-chain',
        'Cada operación on-chain tiene costo directo para usuarios. Contratos ineficientes desincentivan adopción y aumentan el vector de ataque por complejidad.',
        ['purpose=blockchain-dev'],
        ['Menor costo para usuarios', 'Menor superficie de ataque', 'Mejor UX'],
        ['Trade-off entre optimización y legibilidad', 'Tiempo extra de profiling'],
        ['Patrones de proxy para upgrades', 'Off-chain computation con verificación on-chain'],
      ),
    );
  }
  if (purpose === 'embedded-systems') {
    result.push(
      recommendation(
        'embedded-hardware-abstraction',
        'recommended',
        'Implementar capa de abstracción de hardware y gestión de memoria',
        'Sistemas embebidos con acoplamiento directo al hardware son imposibles de testear y portar. Una HAL (Hardware Abstraction Layer) facilita testing, portabilidad y mantenimiento.',
        ['purpose=embedded-systems'],
        ['Testabilidad sin hardware', 'Portabilidad entre plataformas', 'Mantenimiento a largo plazo'],
        ['Overhead mínimo de indirección', 'Disciplina de diseño'],
        ['Código directo con testing manual en hardware'],
      ),
    );
    result.push(
      recommendation(
        'embedded-memory-rtos',
        'recommended',
        'Definir presupuesto de memoria y evaluar RTOS vs bare-metal',
        'Sin presupuesto de memoria explícito, los sistemas embebidos fallan impredeciblemente. La decisión RTOS vs bare-metal afecta latencia, determinismo y complejidad.',
        ['purpose=embedded-systems'],
        ['Predicibilidad del sistema', 'Detección temprana de overflows', 'Determinismo temporal'],
        ['Restricción de funcionalidades', 'Complejidad de RTOS si no es necesario'],
        ['Allocación estática sin RTOS para sistemas simples'],
      ),
    );
  }
  if (purpose === 'networking') {
    result.push(
      recommendation(
        'networking-observability',
        'recommended',
        'Instrumentar red con métricas, logs de flujo y alertas de latencia',
        'Sin observabilidad de red, los problemas de conectividad se diagnostican por síntomas en aplicaciones. Métricas de red (latencia, pérdida, throughput) permiten detección proactiva.',
        ['purpose=networking'],
        ['Diagnóstico proactivo', 'Capacity planning', 'SLA medibles'],
        ['Volumen de datos de telemetría', 'Complejidad de correlación'],
        ['Monitoreo básico con ping y uptime checks'],
      ),
    );
  }

  if (purpose === 'research') {
    result.push(
      recommendation(
        'research-reproducibility',
        'recommended',
        'Garantizar reproducibilidad con seeds, versiones fijas y resultados intermedios',
        'Investigación no reproducible no puede validarse ni extenderse. Fijar seeds, versiones de dependencias, datos de entrada y guardar checkpoints intermedios permite verificación independiente.',
        ['purpose=research'],
        ['Verificación por terceros', 'Extensión de resultados', 'Publicabilidad'],
        ['Overhead de versionado de datos', 'Almacenamiento de artefactos intermedios'],
        ['Documentar configuración manualmente sin automatización'],
      ),
    );
    result.push(
      recommendation(
        'research-rag-domain',
        'recommended',
        'Configurar RAG sobre papers, documentación y datos del dominio',
        'Un agente de investigación es más efectivo con acceso indexado a literatura relevante, papers previos y documentación del dominio. RAG evita alucinaciones y ancla respuestas en evidencia.',
        ['purpose=research'],
        ['Respuestas ancladas en evidencia', 'Descubrimiento de conexiones', 'Reducción de alucinaciones'],
        ['Curación y actualización del corpus', 'Costo de indexación'],
        ['Búsqueda manual sin indexación'],
      ),
    );
    result.push(
      recommendation(
        'research-notebooks-versioned',
        'info',
        'Versionar notebooks como artefactos reproducibles',
        'Los notebooks tienden a acumular estado oculto y output no reproducible. Versionarlos con output limpio y ejecutarlos en CI garantiza que los resultados son actuales.',
        ['purpose=research'],
        ['Colaboración sin ambigüedad', 'CI de resultados', 'Historial de evolución'],
        ['Disciplina de limpiar output antes de commit', 'Tiempo de CI para notebooks largos'],
        ['Exportar resultados como Markdown o PDF estáticos'],
      ),
    );
  }
  if (purpose === 'documentation') {
    result.push(
      recommendation(
        'docs-style-guide',
        'recommended',
        'Definir style guide y voz consistente para toda la documentación',
        'Documentación sin estilo definido diverge entre autores y confunde a lectores. Un style guide fija tono, terminología, formato y estructura esperada.',
        ['purpose=documentation'],
        ['Consistencia para el lector', 'Onboarding más rápido', 'Revisión objetiva'],
        ['Tiempo inicial de definición', 'Enforcement manual sin tooling'],
        ['Revisión ad-hoc sin criterios explícitos'],
      ),
    );
    result.push(
      recommendation(
        'docs-versioned-with-code',
        'recommended',
        'Versionar documentación junto al código y validar en CI',
        'Docs separadas del código se desactualizan silenciosamente. Co-locación y validación en CI (links rotos, ejemplos ejecutables) mantienen la documentación viva.',
        ['purpose=documentation'],
        ['Docs siempre actualizadas', 'Detección de roturas', 'Ejemplos verificables'],
        ['Más archivos en el repo', 'CI más lento por validación de docs'],
        ['Wiki externa sin validación automática'],
      ),
    );
    result.push(
      recommendation(
        'docs-stale-detection',
        'info',
        'Detectar documentación obsoleta comparando con cambios del código',
        'Cuando el código cambia y la documentación no, el lector recibe información incorrecta. Detectar docs afectadas por un diff permite actualización proactiva.',
        ['purpose=documentation'],
        ['Reducción de docs incorrectas', 'Priorización de actualizaciones', 'Confianza del lector'],
        ['Heurísticas imperfectas', 'Falsos positivos en detección'],
        ['Revisión manual de docs en cada release'],
      ),
    );
  }
  if (purpose === 'custom') {
    result.push(
      recommendation(
        'custom-purpose-review',
        'warning',
        'Propósito custom sin recomendaciones predefinidas — revisar el bundle con cuidado',
        'El propósito seleccionado no tiene reglas de recomendación específicas en el motor. El bundle se genera correctamente pero sin validación de dominio. Revisa steering, permisos y scope manualmente.',
        ['purpose=custom'],
        ['Flexibilidad total', 'Sin restricciones de dominio'],
        ['Sin guidance específica', 'Mayor responsabilidad de revisión manual'],
        ['Elegir el propósito predefinido más cercano para obtener recomendaciones'],
      ),
    );
  }

  if (environment === 'production' || environment === 'both') {
    result.push(
      recommendation(
        'production-guardrails',
        'recommended',
        'Separar políticas de producción y desarrollo',
        'Producción requiere identidad de workload, mínimo privilegio, aprobación y rollback; no debe heredar permisos del entorno de desarrollo.',
        [`environment=${environment}`],
        ['Reduce el radio de impacto', 'Permite auditoría y reversión'],
        ['Añade configuración operacional'],
        ['Mantener el agente sólo en modo asesor en producción'],
      ),
    );
  }
  if (deployment === 'aws-ec2') {
    result.push(
      recommendation(
        'aws-ec2-baseline',
        'recommended',
        'Operar EC2 con un baseline reproducible',
        'EC2 entrega control del servidor, pero el equipo debe resolver proceso, parches, observabilidad y secretos.',
        ['deployment_target=aws-ec2'],
        ['Control del runtime', 'Integración con IAM, SSM y CloudWatch'],
        ['Mayor responsabilidad operacional'],
        ['AWS ECS/Fargate', 'AWS Lambda si el workload es stateless'],
      ),
    );
  }
  // Cloud-native observability recommendations
  const observabilityList = Array.isArray(answers.observability) ? answers.observability : [];
  if (typeof deployment === 'string' && deployment.startsWith('aws-') && !observabilityList.includes('cloudwatch')) {
    result.push(
      recommendation(
        'aws-native-observability',
        'recommended',
        'Integrar CloudWatch para observabilidad nativa de AWS',
        'Servicios AWS emiten métricas, logs y trazas a CloudWatch de forma nativa. Sin esta integración se pierde visibilidad operacional inmediata y alertas automáticas.',
        [`deployment_target=${deployment}`, 'observability no incluye cloudwatch'],
        [
          'Visibilidad nativa sin agentes adicionales',
          'Alertas integradas con servicios AWS',
          'Dashboards automáticos',
        ],
        ['Vendor lock-in en observabilidad', 'Costos por volumen de logs y métricas'],
        ['OpenTelemetry con exportador a backend independiente', 'Datadog o Grafana Cloud'],
      ),
    );
  }
  if (
    typeof deployment === 'string' &&
    deployment.startsWith('azure-') &&
    !observabilityList.some((o) => o.startsWith('azure-') || o === 'azure-monitor')
  ) {
    result.push(
      recommendation(
        'azure-native-observability',
        'recommended',
        'Integrar Azure Monitor para observabilidad nativa',
        'Los servicios Azure emiten telemetría a Azure Monitor y Application Insights. Sin esta integración se pierde correlación automática entre recursos.',
        [`deployment_target=${deployment}`, 'observability no incluye herramientas Azure'],
        ['Correlación automática entre servicios Azure', 'KQL para análisis avanzado', 'Alertas integradas'],
        ['Vendor lock-in', 'Costos por ingesta y retención'],
        ['OpenTelemetry exportando a backend multi-cloud', 'Datadog o Elastic'],
      ),
    );
  }
  if (
    typeof deployment === 'string' &&
    deployment.startsWith('gcp-') &&
    !observabilityList.some((o) => o.startsWith('gcp-') || o === 'google-cloud-operations')
  ) {
    result.push(
      recommendation(
        'gcp-native-observability',
        'recommended',
        'Integrar Google Cloud Operations para observabilidad nativa',
        'Los servicios GCP emiten logs y métricas a Cloud Logging y Monitoring. Sin esta integración se pierde la trazabilidad automática del stack.',
        [`deployment_target=${deployment}`, 'observability no incluye herramientas GCP'],
        ['Integración nativa con servicios GCP', 'Trazas distribuidas con Cloud Trace', 'Alertas y SLOs integrados'],
        ['Vendor lock-in', 'Costos por volumen de telemetría'],
        ['OpenTelemetry con exportador independiente', 'Datadog o Grafana Cloud'],
      ),
    );
  }
  // Data engineering on AWS: recommend Glue/Athena/EMR
  if (purpose === 'data-engineering' && typeof deployment === 'string' && deployment.startsWith('aws-')) {
    result.push(
      recommendation(
        'aws-data-stack',
        'info',
        'Considerar Glue, Athena y EMR para el stack de datos en AWS',
        'AWS ofrece servicios nativos para ETL (Glue), consultas ad-hoc (Athena) y procesamiento big data (EMR) que se integran con S3 como data lake.',
        ['purpose=data-engineering', `deployment_target=${deployment}`],
        ['Integración nativa con S3', 'Serverless para ETL y consultas', 'Escalado elástico con EMR'],
        ['Vendor lock-in', 'Curva de aprendizaje de Glue', 'Costos por escaneo en Athena'],
        ['Spark autoservido en Kubernetes', 'dbt + warehouse independiente'],
      ),
    );
  }
  // Machine learning on AWS: recommend SageMaker
  if (purpose === 'machine-learning' && typeof deployment === 'string' && deployment.startsWith('aws-')) {
    result.push(
      recommendation(
        'aws-ml-sagemaker',
        'info',
        'Considerar SageMaker para entrenamiento y serving de modelos',
        'SageMaker ofrece notebooks, entrenamiento distribuido, tuning de hiperparámetros y endpoints de inferencia integrados con el ecosistema AWS.',
        ['purpose=machine-learning', `deployment_target=${deployment}`],
        [
          'Entrenamiento distribuido administrado',
          'Endpoints de inferencia autoescalables',
          'Integración con S3 y IAM',
        ],
        ['Vendor lock-in', 'Costos elevados en instancias GPU', 'Complejidad de configuración'],
        ['Vertex AI en GCP', 'MLflow + Kubernetes autoservido', 'Ray en EKS'],
      ),
    );
  }
  if (deployment === 'vps') {
    result.push(
      recommendation(
        'vps-baseline',
        'recommended',
        'Operar VPS con proceso reproducible y acceso restringido',
        'Un VPS auto-gestionado requiere parches del SO, acceso restringido por SSH/VPN, monitorización activa y backups verificados.',
        ['deployment_target=vps'],
        ['Control total del entorno', 'Sin dependencia de proveedor cloud'],
        ['Responsabilidad completa de parches, seguridad y disponibilidad'],
        ['Plataforma administrada (Render, Fly.io)', 'Contenedores con orquestador'],
      ),
    );
  }
  if (architecture === 'microservices') {
    result.push(
      recommendation(
        'microservices-observability',
        'recommended',
        'Definir límites y trazabilidad distribuida',
        'Los microservicios sólo aportan independencia si contratos, ownership y observabilidad están explícitos.',
        ['architecture=microservices'],
        ['Despliegues independientes', 'Escalado por servicio'],
        ['Complejidad de red y operación'],
        ['Monolito modular hasta que existan límites y equipos claros'],
      ),
    );
  }
  if (architecture === 'serverless') {
    result.push(
      recommendation(
        'serverless-stateless',
        'info',
        'Mantener funciones stateless e idempotentes',
        'El escalado administrado funciona mejor con estado externo y eventos reintentables.',
        ['architecture=serverless'],
        ['Escalado por demanda', 'Menor operación de servidores'],
        ['Cold starts y dependencia del proveedor'],
        ['Contenedores administrados'],
      ),
    );
    result.push(
      recommendation(
        'serverless-cost-monitoring',
        'recommended',
        'Monitorizar costos y cold starts en serverless',
        'El modelo pay-per-invocation requiere alertas de costo y optimización de cold starts para mantener latencia predecible.',
        ['architecture=serverless'],
        ['Escalado automático sin servidores', 'Pago por uso'],
        ['Cold starts', 'Vendor lock-in', 'Gestión de estado externo'],
        ['Contenedores administrados con escalado a cero'],
      ),
    );
  }
  if (architecture === 'cqrs') {
    result.push(
      recommendation(
        'cqrs-separation',
        'recommended',
        'Separar stores de lectura y escritura en CQRS',
        'CQRS aporta flexibilidad al independizar modelos de consulta y comandos, pero añade complejidad de sincronización y testing.',
        ['architecture=cqrs'],
        ['Optimización independiente de lectura y escritura', 'Escalado selectivo'],
        ['Consistencia eventual', 'Complejidad de testing', 'Necesidad de event sourcing o proyecciones'],
        ['Monolito modular con vistas materializadas'],
      ),
    );
  }
  if (architecture === 'event-driven') {
    result.push(
      recommendation(
        'event-driven-resilience',
        'recommended',
        'Garantizar idempotencia y dead letter queues en event-driven',
        'Componentes desacoplados por eventos necesitan broker confiable, idempotencia, DLQ y observabilidad de mensajes.',
        ['architecture=event-driven'],
        ['Desacoplamiento de componentes', 'Escalado por particiones'],
        ['Complejidad de orquestación', 'Debugging distribuido', 'Selección de broker'],
        ['Comunicación síncrona con circuit breakers'],
      ),
    );
  }
  if (architecture === 'hexagonal') {
    result.push(
      recommendation(
        'hexagonal-ports-adapters',
        'recommended',
        'Mantener disciplina de puertos y adaptadores',
        'La arquitectura hexagonal aísla el dominio de la infraestructura; la inversión de dependencias y los contratos explícitos facilitan testing unitario.',
        ['architecture=hexagonal'],
        ['Dominio testeable sin infraestructura', 'Adaptadores intercambiables'],
        ['Más indirección inicial', 'Disciplina de equipo para no violar límites'],
        ['Clean Architecture', 'Monolito modular con módulos internos'],
      ),
    );
  }
  if (architecture === 'clean-architecture') {
    result.push(
      recommendation(
        'clean-architecture-layers',
        'recommended',
        'Respetar la regla de dependencia y los límites de capas',
        'Clean Architecture exige que las dependencias apunten hacia el centro; los use cases orquestan sin conocer frameworks.',
        ['architecture=clean-architecture'],
        ['Use cases explícitos y testeables', 'Independencia de frameworks'],
        ['Más código de adaptación', 'Posible sobre-ingeniería para proyectos simples'],
        ['Hexagonal', 'Monolito modular con convenciones de carpetas'],
      ),
    );
  }
  if (architecture === 'data-pipeline') {
    result.push(
      recommendation(
        'data-pipeline-quality',
        'recommended',
        'Implementar calidad de datos, linaje y reintentos',
        'Un pipeline de datos necesita validación de esquemas, tracking de linaje, dead letter para registros fallidos y políticas de reintento.',
        ['architecture=data-pipeline'],
        ['Trazabilidad de datos', 'Detección temprana de errores', 'Reproducibilidad'],
        ['Infraestructura de schema registry', 'Complejidad de orquestación', 'Costos de almacenamiento de linaje'],
        ['ETL simple con validación manual', 'Procesamiento batch con alertas de calidad'],
      ),
    );
  }
  if ((environment === 'production' || environment === 'both') && technologies.includes('sqlite')) {
    result.push(
      recommendation(
        'sqlite-production',
        'warning',
        'Revisar SQLite para producción concurrente',
        'SQLite es excelente como base embebida, pero múltiples réplicas y escrituras concurrentes requieren una estrategia explícita.',
        ['technologies incluye sqlite', `environment=${environment}`],
        ['Simplicidad y portabilidad'],
        ['Coordinación de escritura y almacenamiento persistente'],
        ['PostgreSQL', 'Una sola réplica con backups verificados'],
      ),
    );
  }
  if (answers.pr_review_enabled === true) {
    result.push(
      recommendation(
        'pr-human-merge',
        'recommended',
        'Mantener el merge bajo control humano',
        'El revisor debe producir evidencia y comentarios reproducibles, no decidir por sí solo la integración.',
        ['pr_review_enabled=true'],
        ['Reduce cambios no autorizados', 'Conserva trazabilidad'],
        ['Requiere revisión humana'],
        ['Quality gates automáticos para verificaciones deterministas'],
      ),
    );
  }
  if (targets.includes('kiro')) {
    result.push(
      recommendation(
        'kiro-structure',
        'info',
        'Separar steering, hooks y skills de Kiro',
        'Las reglas estables pertenecen a steering, los eventos a hooks y los procedimientos reutilizables a skills.',
        ['agent_targets incluye kiro'],
        ['Configuración modular', 'Contexto mantenible'],
        ['Las plantillas deben revisarse en el proyecto destino'],
        ['Usar sólo AGENTS.md como formato portable'],
      ),
    );
  }
  if (
    answers.autonomy === 'autonomous' ||
    (Array.isArray(answers.capabilities) &&
      answers.capabilities.some((value) => value === 'deploy' || value === 'operate-production'))
  ) {
    result.push(
      recommendation(
        'privileged-actions',
        'warning',
        'Acotar acciones privilegiadas',
        'Deploy y operación no deben depender únicamente de instrucciones del modelo.',
        ['autonomy/capabilities incluyen acciones con efectos'],
        ['Menor riesgo operacional'],
        ['Requiere integración de aprobación'],
        ['Modo asesor', 'Preparar plan y ejecutar desde CI/CD aprobado'],
      ),
    );
  }
  // #327: production without identity/secrets controls
  const securityControls = Array.isArray(answers.security_controls) ? answers.security_controls : [];
  if (
    (environment === 'production' || environment === 'both') &&
    !securityControls.includes('secrets-manager') &&
    !securityControls.includes('least-privilege')
  ) {
    result.push(
      recommendation(
        'production-identity-secrets',
        'warning',
        'Producción requiere gestión de identidad y secretos',
        'Un agente en producción sin gestor de secretos ni mínimo privilegio expone credenciales y amplía el radio de impacto.',
        [`environment=${environment}`, 'security_controls no incluye secrets-manager ni least-privilege'],
        ['Secretos rotables y auditables', 'Permisos acotados por tarea'],
        ['Configuración adicional del gestor de secretos'],
        ['Añadir secrets-manager y least-privilege a los controles de seguridad'],
      ),
    );
  }
  return result;
}

function buildWarnings(answers: CreatorAnswers): string[] {
  const warnings: string[] = [];
  // #334: PR review with local repository
  if (answers.pr_review_enabled === true && answers.repository_provider === 'local-repository') {
    warnings.push(
      'PR review habilitado con repositorio local: la integración de PR no funcionará sin un proveedor remoto (GitHub, GitLab, etc.).',
    );
  }
  // #335: mismatched repo provider and CI/CD
  const repo = answers.repository_provider;
  const ciCdList = Array.isArray(answers.ci_cd) ? answers.ci_cd : [];
  if ((repo === 'gitlab' || repo === 'bitbucket') && ciCdList.includes('github-actions')) {
    warnings.push(
      `CI/CD configurado como GitHub Actions pero el repositorio es ${repo === 'gitlab' ? 'GitLab' : 'Bitbucket'}: la integración nativa no estará disponible sin configuración adicional.`,
    );
  }
  // #339: deployment_target + container_platforms inconsistency
  const deployment = answers.deployment_target;
  const containers = Array.isArray(answers.container_platforms) ? answers.container_platforms : [];
  if (
    (deployment === 'aws-lambda' || deployment === 'azure-functions' || deployment === 'gcp-cloud-functions') &&
    containers.includes('kubernetes')
  ) {
    warnings.push(
      'Kubernetes seleccionado como plataforma de contenedores pero el destino de producción es serverless: Kubernetes no aplica en un entorno sin servidores administrados.',
    );
  }
  if (deployment === 'vps' && containers.includes('kubernetes') && !containers.includes('k3s')) {
    warnings.push(
      'Kubernetes seleccionado en un VPS sin orquestador ligero: considera k3s o Docker Compose para entornos auto-gestionados sin un clúster dedicado.',
    );
  }
  return warnings;
}

export function evaluateDecisionTree(input: unknown): DecisionEvaluation {
  const parsed = parseCreatorAnswers(input);
  const answers: CreatorAnswers = {};
  const visibleQuestions: DecisionQuestion[] = [];

  // Rebuild the path in declaration order. Answers from branches that are no
  // longer visible are intentionally discarded so they cannot affect output.
  for (const question of creatorQuestions) {
    if (question.visibleWhen && !conditionMatches(question.visibleWhen, answers)) continue;
    visibleQuestions.push(question);
    const answerValue = parsed.answers[question.id];
    if (answerValue !== undefined) answers[question.id] = answerValue;
  }

  const visibleIds = new Set(visibleQuestions.map((question) => question.id));
  const issues = parsed.issues.filter((issue) => {
    const questionId = issue.path.replace(/^answers\./, '');
    return visibleIds.has(questionId);
  });
  const discarded = Object.keys(parsed.answers).filter((questionId) => !visibleIds.has(questionId));
  const answeredQuestionIds = visibleQuestions
    .filter((question) => isAnswered(question, answers[question.id]))
    .map((question) => question.id);
  const requiredQuestions = visibleQuestions.filter((question) => question.required);
  const nextQuestion = requiredQuestions.find((question) => !isAnswered(question, answers[question.id])) ?? null;
  const answeredRequired = requiredQuestions.filter((question) => isAnswered(question, answers[question.id])).length;
  const percent =
    requiredQuestions.length === 0 ? 100 : Math.round((answeredRequired / requiredQuestions.length) * 100);
  const warnings = [...parsed.warnings];
  if (discarded.length > 0) warnings.push(`Se descartaron respuestas de ramas no visibles: ${discarded.join(', ')}.`);

  const custom = Object.entries(answers).flatMap(([key, value]) => {
    const values = Array.isArray(value) ? value : [value];
    return values
      .filter((item) => typeof item === 'string' && item.startsWith('custom:'))
      .map((item) => `${key}=${item}`);
  });
  if (custom.length > 0)
    warnings.push(
      `Opciones personalizadas sin adaptador automático: ${custom.join(', ')}. Se conservarán en blueprint y documentación.`,
    );
  if ((answers.environment === 'production' || answers.environment === 'both') && answers.human_approval === false) {
    warnings.push(
      'Producción sin aprobación humana: el preview documentará el conflicto y no recomendará ejecución autónoma.',
    );
  }

  warnings.push(...buildWarnings(answers));

  return {
    workflowVersion: WORKFLOW_VERSION,
    answers,
    visibleQuestions,
    answeredQuestionIds,
    nextQuestion,
    progress: {
      answered: answeredRequired,
      total: requiredQuestions.length,
      percent,
      complete: nextQuestion === null && issues.length === 0,
    },
    recommendations: buildRecommendations(answers),
    warnings,
    issues,
  };
}

// #407: the workflow definition is immutable per deploy, so pre-compute it once
// instead of rebuilding the object on every /workflow request.
const workflowDefinition = Object.freeze({
  id: 'agent-builder',
  version: WORKFLOW_VERSION,
  catalogVersion: CATALOG_VERSION,
  mode: 'stateless',
  description: 'Árbol de decisiones guiado para generar configuraciones de agentes de desarrollo y producción.',
  answersContract: 'El cliente reenvía todas las respuestas acumuladas en cada evaluación.',
  questions: creatorQuestions,
});

export function getWorkflowDefinition() {
  return workflowDefinition;
}

export function describeCatalogSelection(id: string): string {
  return getCatalogItem(id)?.label ?? id.replace(/^custom:/, 'Personalizado: ');
}
