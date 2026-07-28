import type { DecisionQuestion, Workflow } from '@artemisa/types';
import type { Locale } from '@/i18n';

/**
 * English strings for the decision tree.
 *
 * The workflow contract lives in the backend (`src/creator/decisionTree.ts`)
 * and is Spanish-only: prompts, descriptions, placeholders and section names
 * come from there. With the UI in English the Creator still rendered those
 * fields in Spanish (issue #737), so the frontend translates them by question
 * id at the API boundary. Anything without a translation falls back to the
 * backend text, which keeps the UI usable when the tree gains a question.
 */
interface QuestionStrings {
  prompt: string;
  description?: string;
  placeholder?: string;
}

const SECTIONS_EN: Record<string, string> = {
  Identidad: 'Identity',
  Objetivo: 'Goal',
  Proyecto: 'Project',
  Stack: 'Stack',
  Arquitectura: 'Architecture',
  Entornos: 'Environments',
  'Entorno de desarrollo': 'Development environment',
  Pruebas: 'Testing',
  Producción: 'Production',
  DevOps: 'DevOps',
  Seguridad: 'Security',
  Permisos: 'Permissions',
  Conocimiento: 'Knowledge',
  'Pull requests': 'Pull requests',
  Salida: 'Output',
};

const QUESTIONS_EN: Record<string, QuestionStrings> = {
  agent_name: {
    prompt: 'What will the agent be called?',
    description: 'A short name keeps files, skills and documentation identifiable.',
    placeholder: 'e.g. platform-reviewer',
  },
  purpose: {
    prompt: 'What main problem will it solve?',
    description: 'The purpose opens specialised branches and recommendations.',
  },
  objective: {
    prompt: 'Describe the outcome you expect from the agent',
    description: 'Explain inputs, output and limits; do not include credentials.',
    placeholder: 'e.g. review every PR, explain risks and propose changes without auto-merging.',
  },
  success_criteria: {
    prompt: 'How will you know it works correctly?',
    description: 'Define a verifiable criterion to validate the agent.',
    placeholder: 'e.g. every PR gets a prioritised report and no critical false positives ship.',
  },
  agent_persona: {
    prompt: 'Does it have a particular style, tone or constraint?',
    description:
      'Optional. Added verbatim to the generated system prompt — writing tone, taboos, formality, and so on.',
    placeholder: 'e.g. direct tone, no marketing jargon, always cite the exact line of code.',
  },
  project_stage: {
    prompt: 'What stage is the project at?',
    description: 'An existing project prioritises compatibility; a new one allows structural suggestions.',
  },
  technologies: {
    prompt: 'Select the project technologies',
    description: 'You can combine languages, frameworks and data stores, and add `custom:<slug>`.',
  },
  architecture: {
    prompt: 'Which architecture best describes the application?',
    description: 'The recommendation adapts to team size, deployment and operations.',
  },
  repository_provider: {
    prompt: 'Where does the code live?',
    description: 'Defines PR, issue tracking and CI integrations.',
  },
  environment: {
    prompt: 'Where will the agent work?',
    description: 'Development and production have different permissions, risks and artifacts.',
  },
  development_setup: {
    prompt: 'How is the development environment prepared?',
    description: 'Lets the bundle generate reproducible setup steps.',
  },
  testing_tools: {
    prompt: 'Which testing and quality tools does the project use?',
    description: 'Select the validation practices already in place or wanted.',
  },
  deployment_target: {
    prompt: 'Where does the application or agent run?',
    description: 'Pick EC2, containers, Kubernetes, serverless or managed hosting.',
  },
  container_platforms: {
    prompt: 'Which packaging or orchestration layer do you use?',
    description: 'Optional for serverless or fully managed platforms.',
  },
  ci_cd: {
    prompt: 'Which CI/CD platforms will you use?',
    description: 'The agent documents quality gates and promotion without deploying by itself.',
  },
  infrastructure: {
    prompt: 'How is the infrastructure defined?',
    description: 'Select the applicable IaC and automation.',
  },
  observability: {
    prompt: 'What observability does it need?',
    description: 'Production should cover errors, logs, metrics and traces according to risk.',
  },
  security_controls: {
    prompt: 'Select security and supply chain controls',
    description: 'Secrets are referenced by name; values are never included.',
  },
  capabilities: {
    prompt: 'Which capabilities does the agent need?',
    description: 'Grant only what is needed. Production does not enable writes or deploys by default.',
  },
  autonomy: {
    prompt: 'What level of autonomy will it have?',
    description: 'Advisory mode is the safest value; the others require extra controls.',
  },
  human_approval: {
    prompt: 'Require human approval for actions with side effects?',
    description: 'Mandatory for production, writes, deploys and elevated privileges.',
  },
  knowledge_enabled: {
    prompt: 'Does it need knowledge beyond the prompt?',
    description: 'Enables RAG or versioned instructions when the context does not fit in a short rule.',
  },
  knowledge_sources: {
    prompt: 'Which sources will it use?',
    description: 'The preview only documents sources; it does not read files or URLs.',
  },
  pr_review_enabled: {
    prompt: 'Should it include a specialised PR review configuration?',
    description: 'Generates rubric, severities and permissions; never enables auto-merge.',
  },
  pr_review_focus: {
    prompt: 'What should it prioritise in PRs?',
    description: 'The report explains evidence, severity and the suggested fix.',
  },
  agent_targets: {
    prompt: 'Which platforms will the configuration be generated for?',
    description: 'Select one or more real targets. You can generate native artifacts for several platforms at once.',
  },
  hooks_enabled: {
    prompt: 'Generate recommended policies and hooks?',
    description: 'Generated hooks are reviewable templates and never run during the preview.',
  },
  skills_enabled: {
    prompt: 'Generate reusable skills?',
    description: 'Turns the main procedure into a documented skill.',
  },
  skills_focus: {
    prompt: 'What focus should the skills have?',
    description: 'Each profile preselects recommended catalog skills; custom opens the full browser.',
  },
  skills_selection: {
    prompt: 'Select the specific skills',
    description: 'Full browser of the available skills.',
  },
  mcps_enabled: {
    prompt: 'Enable MCP integrations?',
    description: 'Lets the agent talk to MCP (Model Context Protocol) servers.',
  },
  mcps_selection: {
    prompt: 'Select the MCP servers',
    description: 'Browser of the integrations available to the agent.',
  },
};

/** Section name in the active locale, falling back to the backend value. */
export function localizeSection(section: string, locale: Locale): string {
  if (locale === 'es') return section;
  return SECTIONS_EN[section] ?? section;
}

/** Question with prompt, description, placeholder and section in the locale. */
export function localizeQuestion<T extends DecisionQuestion>(question: T, locale: Locale): T {
  if (locale === 'es') return question;
  const strings = QUESTIONS_EN[question.id];
  const section = localizeSection(question.section, locale);
  if (!strings) return section === question.section ? question : { ...question, section };
  return {
    ...question,
    section,
    prompt: strings.prompt,
    description: strings.description ?? question.description,
    placeholder: strings.placeholder ?? question.placeholder,
  };
}

export function localizeQuestions<T extends DecisionQuestion>(questions: T[], locale: Locale): T[] {
  if (locale === 'es') return questions;
  return questions.map((question) => localizeQuestion(question, locale));
}

/** Workflow definition with every question localized. */
export function localizeWorkflow(workflow: Workflow | null, locale: Locale): Workflow | null {
  if (!workflow || locale === 'es') return workflow;
  return { ...workflow, questions: localizeQuestions(workflow.questions, locale) };
}

/** Question ids that have an English translation. Exported for tests. */
export const TRANSLATED_QUESTION_IDS = Object.keys(QUESTIONS_EN);

/** Section names that have an English translation. Exported for tests. */
export const TRANSLATED_SECTIONS = Object.keys(SECTIONS_EN);
