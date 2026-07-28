import {
  AgentAnswerResponse,
  AgentGenerateResponse,
  AgentProtocolResponse,
  AgentStartResponse,
  CreatorAnswers,
  CreatorInputError,
  CreatorRecommendation,
  DecisionQuestion,
} from './domain.js';
import { getCreatorCatalog } from './catalog.js';
import { evaluateDecisionTree } from './decisionTree.js';
import { generateAgentBundle as generateBundle, describeTargetApplication } from './generator.js';

const PROTOCOL_VERSION = '1.0.0';

function extractAnswers(body: unknown): unknown {
  if (body === undefined || body === null) return undefined;
  if (typeof body !== 'object' || Array.isArray(body)) return undefined;
  const record = body as Record<string, unknown>;
  return record.answers;
}

function buildHint(
  question: DecisionQuestion,
  answers: CreatorAnswers,
  recommendations: CreatorRecommendation[],
): string | undefined {
  const pieces: string[] = [];

  if (question.catalogCategories && question.catalogCategories.length > 0) {
    const labels: string[] = [];
    for (const category of question.catalogCategories) {
      const items = getCreatorCatalog({ category }).items.slice(0, 2);
      for (const item of items) labels.push(item.label);
    }
    if (labels.length > 0) {
      pieces.push(`Opciones populares: ${labels.slice(0, 6).join(', ')}.`);
    }
  }

  const purpose = answers.purpose;
  if (
    question.id === 'deployment_target' &&
    (purpose === 'operations' || purpose === 'devops' || purpose === 'operate-production')
  ) {
    pieces.push('Para producción considera AWS, GCP o Azure por su SLA.');
  }
  if (question.id === 'observability' && purpose === 'operations') {
    pieces.push('Incluye logs, métricas y trazas críticas para incidentes.');
  }

  const relevant = recommendations.filter((rec) =>
    rec.evidence.some((ev) => ev.includes(question.id) || question.id.includes(ev)),
  );
  if (relevant.length > 0) {
    pieces.push(
      `Recomendaciones: ${relevant
        .slice(0, 2)
        .map((r) => r.title)
        .join(' · ')}.`,
    );
  }

  const hint = pieces.join(' ').trim();
  return hint.length > 0 ? hint : undefined;
}

function formatQuestion(
  question: DecisionQuestion,
  answers: CreatorAnswers,
  recommendations: CreatorRecommendation[],
): AgentStartResponse['first_question'] {
  return {
    id: question.id,
    prompt: question.prompt,
    type: question.type,
    required: question.required,
    options: question.options,
    catalogCategories: question.catalogCategories,
    hint: buildHint(question, answers, recommendations),
  };
}

export function getAgentProtocol(baseUrl: string): AgentProtocolResponse {
  const targets = getCreatorCatalog({ category: 'agent-platform' }).items.map((item) => item.id);
  return {
    protocol: 'artemisa-agent-onboarding',
    version: PROTOCOL_VERSION,
    description: 'Protocolo para que un agente de IA configure un agente de desarrollo/operación mediante Artemisa.',
    baseUrl,
    instructions: {
      summary:
        'Artemisa genera configuración determinista para agentes IA. Sigue estos pasos para crear un bundle personalizado.',
      steps: [
        {
          step: 1,
          action: `GET ${baseUrl}/agent/start`,
          description: 'Obtén la primera pregunta y las opciones del catálogo completo.',
          note: 'Presenta las opciones al usuario de forma clara y espera su respuesta.',
        },
        {
          step: 2,
          action: `POST ${baseUrl}/agent/answer`,
          description: 'Envía cada respuesta y recibe la siguiente pregunta.',
          note: 'Repite hasta que progress.complete sea true.',
          body_format: { answers: { '<question_id>': '<value>' } },
        },
        {
          step: 3,
          action: `POST ${baseUrl}/agent/generate`,
          description: 'Con todas las respuestas completas, genera el bundle.',
          note: 'Descarga los artefactos y aplícalos según la guía incluida.',
        },
      ],
    },
    tips_for_agents: [
      'Presenta las opciones al usuario de forma conversacional, no como un dump de JSON.',
      'Si el usuario no sabe qué elegir, usa las recomendaciones del campo recommendations.',
      'Puedes agrupar preguntas por sección para hacer el flujo más ágil.',
      'El campo progress.percent te indica cuánto falta.',
      'Al terminar, aplica los artefactos según el target seleccionado (Cursor → .cursor/rules/, etc.).',
    ],
    available_targets: targets,
    documentation_url: `${baseUrl}/startup`,
  };
}

function categoryIds(category: string): string[] {
  return getCreatorCatalog({ category }).items.map((item) => item.id);
}

export function getAgentStart(): AgentStartResponse {
  const evaluation = evaluateDecisionTree({});
  const firstQuestion = evaluation.nextQuestion;
  if (!firstQuestion) {
    throw new Error('El árbol de decisiones no tiene una primera pregunta.');
  }

  const summary: Record<string, string[]> = {
    languages: categoryIds('language'),
    frameworks: [...categoryIds('frontend'), ...categoryIds('backend')],
    databases: categoryIds('database'),
    architectures: categoryIds('architecture'),
    targets: categoryIds('agent-platform'),
    clouds: categoryIds('cloud'),
  };

  return {
    session: {
      description: 'Sesión stateless — acumula las respuestas localmente y envíalas en cada request.',
    },
    catalog_summary: summary,
    first_question: formatQuestion(firstQuestion, {}, evaluation.recommendations),
    total_questions_estimate: '18-26',
  };
}

export function processAgentAnswer(body: unknown): AgentAnswerResponse {
  const answers = extractAnswers(body);
  try {
    const evaluation = evaluateDecisionTree(answers);
    const next_question = evaluation.nextQuestion
      ? formatQuestion(evaluation.nextQuestion, evaluation.answers, evaluation.recommendations)
      : null;
    if (evaluation.progress.complete) {
      evaluation.warnings.push('Flujo completo. Llama a POST /api/v1/creator/agent/generate con todas las respuestas.');
    }
    return {
      progress: evaluation.progress,
      next_question,
      recommendations_so_far: evaluation.recommendations,
      warnings: evaluation.warnings,
      issues: evaluation.issues,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error procesando respuestas.';
    const issues = error instanceof CreatorInputError ? error.issues : [{ path: 'answers', message }];
    return {
      progress: { answered: 0, total: 0, percent: 0, complete: false },
      next_question: undefined,
      recommendations_so_far: [],
      warnings: [message],
      issues,
    };
  }
}

export function generateAgentBundle(body: unknown): AgentGenerateResponse {
  const answers = extractAnswers(body);
  const bundle = generateBundle(answers);
  const instructions: Record<string, string> = {};
  for (const target of bundle.manifest.targets) {
    instructions[target] = describeTargetApplication(target, bundle.blueprint);
  }
  return {
    ...bundle,
    application_instructions: instructions,
  };
}

export function getStartupDocument(baseUrl: string): string {
  return `# Artemisa Startup — Protocolo de Onboarding para Agentes IA

Eres un agente de IA que va a ayudar al usuario a configurar un agente de desarrollo/operación personalizado.
Sigue estos pasos exactamente:

## Paso 1: Presentación
Dile al usuario: "Voy a ayudarte a configurar un agente personalizado con Artemisa. Te haré una serie de preguntas sobre tu proyecto y generaré la configuración óptima para tu herramienta."

## Paso 2: Obtén las preguntas
Haz un GET a: ${baseUrl}/agent/start

## Paso 3: Conversación guiada
Por cada pregunta:
1. Preséntala al usuario de forma natural.
2. Si tiene opciones, listarlas brevemente.
3. Espera la respuesta.
4. Envía un POST a: ${baseUrl}/agent/answer
   con todas las respuestas acumuladas hasta ahora en el campo \`answers\`.
5. Repite con la siguiente pregunta hasta que \`progress.complete\` sea \`true\`.

## Paso 4: Generación
Cuando esté completo, haz POST a: ${baseUrl}/agent/generate
con todas las respuestas.

## Paso 5: Aplicación
Con el bundle recibido:
1. Lee el campo \`application_instructions\` para saber dónde poner cada archivo.
2. Crea los archivos en el proyecto del usuario.
3. Muestra un resumen de lo que se configuró y por qué (usa \`docs/WHY.md\` del bundle).

## Notas importantes
- No inventes respuestas: pregunta siempre al usuario.
- Si el usuario no sabe qué elegir, consulta el campo \`hint\` de cada pregunta.
- Los artefactos nunca contienen secretos reales, solo referencias como \${GITHUB_TOKEN}.
- No ejecutes ni despliegues nada: solo genera y aplica archivos de configuración.

## Documentación oficial
Para consultar la documentación completa del proyecto (arquitectura, API, deployment, troubleshooting):
haz un GET a: ${baseUrl}/docs
Devuelve un JSON con la lista de documentos oficiales, sus títulos, descripciones y categorías.
`;
}
