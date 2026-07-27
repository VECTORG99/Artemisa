import { CreatorError, ErrorCodes } from '../errors.js';
export type CreatorAnswerValue = string | boolean | string[];
export type CreatorAnswers = Record<string, CreatorAnswerValue>;

export type EnvironmentScope = 'development' | 'production' | 'both' | 'testing' | 'staging' | 'local';
export type QuestionType =
  'text' | 'textarea' | 'select' | 'multiselect' | 'boolean' | 'catalog-multiselect' | 'catalog-select' | 'custom';

export interface CatalogCategory {
  id: string;
  label: string;
  description: string;
  multiple: boolean;
}

export interface CatalogItem {
  id: string;
  category: string;
  label: string;
  description: string;
  tags: string[];
  environments: EnvironmentScope[];
  recommendedFor: string[];
}

export interface QuestionOption {
  id: string;
  label: string;
  description: string;
}

export type QuestionCondition =
  | { operator: 'equals'; questionId: string; value: CreatorAnswerValue }
  | { operator: 'oneOf'; questionId: string; values: CreatorAnswerValue[] }
  | { operator: 'includes'; questionId: string; value: string }
  | { operator: 'all'; conditions: QuestionCondition[] }
  | { operator: 'any'; conditions: QuestionCondition[] };

export interface DecisionQuestion {
  id: string;
  section: string;
  prompt: string;
  description: string;
  type: QuestionType;
  required: boolean;
  placeholder?: string;
  options?: QuestionOption[];
  catalogCategories?: string[];
  visibleWhen?: QuestionCondition;
  maxSelections?: number;
}

export interface CreatorRecommendation {
  id: string;
  severity: 'info' | 'recommended' | 'warning';
  title: string;
  reason: string;
  evidence: string[];
  benefits: string[];
  tradeoffs: string[];
  alternatives: string[];
}

export interface AnswerIssue {
  path: string;
  message: string;
}

export interface DecisionEvaluation {
  workflowVersion: string;
  answers: CreatorAnswers;
  visibleQuestions: DecisionQuestion[];
  answeredQuestionIds: string[];
  nextQuestion: DecisionQuestion | null;
  progress: {
    answered: number;
    total: number;
    percent: number;
    complete: boolean;
  };
  recommendations: CreatorRecommendation[];
  warnings: string[];
  issues: AnswerIssue[];
}

export interface AgentBlueprint {
  schemaVersion: string;
  identity: {
    name: string;
    slug: string;
    description: string;
  };
  purpose: {
    type: string;
    objective: string;
    successCriteria: string;
    /** Optional free-text tone/style/restriction, applied verbatim to the generated system prompt. */
    persona: string | null;
  };
  project: {
    stage: string;
    architecture: string;
    technologies: string[];
    repositoryProvider: string;
  };
  environments: {
    target: EnvironmentScope;
    developmentSetup: string | null;
    deploymentTarget: string | null;
    cloudProvider: string | null;
    containerPlatforms: string[];
  };
  devops: {
    ciCd: string[];
    infrastructure: string[];
    observability: string[];
    compliance: string[];
  };
  agent: {
    autonomy: string;
    capabilities: string[];
    targets: string[];
    requireHumanApproval: boolean;
  };
  knowledge: {
    enabled: boolean;
    sources: string[];
  };
  prReview: {
    enabled: boolean;
    focus: string[];
  };
  features: {
    hooks: boolean;
    skills: boolean;
    steering: boolean;
    agentsMd: boolean;
    kiro: boolean;
  };
  skills: {
    enabled: boolean;
    focus: string;
    /** Resolved skills (from `skills_selection` when focus is 'custom'); empty otherwise. */
    items: Array<{ id: string; name: string; focus: string; sourceUrl: string }>;
  };
  testing: {
    /** Testing tools selected via `testing_tools` question. */
    tools: string[];
  };
  integrations: {
    /** MCP servers selected via `mcps_selection` when `mcps_enabled` is true. */
    mcps: Array<{ id: string; name: string; category: string; sourceUrl: string }>;
  };
  recommendations: CreatorRecommendation[];
}

export interface GeneratedArtifact {
  path: string;
  kind:
    | 'configuration'
    | 'documentation'
    | 'instruction'
    | 'manifest'
    | 'agents-md'
    | 'cursor-rules'
    | 'coderabbit-config'
    | 'devin-rules'
    | 'kilocode-rules';
  mediaType: 'application/json' | 'text/markdown' | 'text/yaml';
  description: string;
  content: string;
  sha256: string;
}

export interface GeneratedAgentBundle {
  generatorVersion: string;
  blueprint: AgentBlueprint;
  artifacts: GeneratedArtifact[];
  manifest: {
    agent: string;
    artifactCount: number;
    targets: string[];
    files: Array<{ path: string; sha256: string; kind: GeneratedArtifact['kind'] }>;
  };
  applicationGuide: {
    summary: string;
    steps: string[];
    productionChecklist: string[];
  };
  warnings: string[];
}

export class CreatorInputError extends CreatorError {
  readonly issues: AnswerIssue[];

  constructor(message: string, issues: AnswerIssue[], statusCode = 400) {
    super(ErrorCodes.CREATOR_INPUT_ERROR, message, statusCode, { issues });
    this.issues = issues;
  }
}

// --- Agent Protocol Types ---

export interface AgentProtocolStep {
  step: number;
  action: string;
  description: string;
  note: string;
  body_format?: Record<string, unknown>;
}

export interface AgentProtocolResponse {
  protocol: 'artemisa-agent-onboarding';
  version: string;
  description: string;
  baseUrl: string;
  instructions: {
    summary: string;
    steps: AgentProtocolStep[];
  };
  tips_for_agents: string[];
  available_targets: string[];
  documentation_url: string;
}

export interface AgentStartResponse {
  session: { description: string };
  catalog_summary: Record<string, string[]>;
  first_question: {
    id: string;
    prompt: string;
    type: QuestionType;
    required: boolean;
    options?: QuestionOption[];
    catalogCategories?: string[];
    hint?: string;
  };
  total_questions_estimate: string;
}

export interface AgentAnswerResponse {
  progress: { answered: number; total: number; percent: number; complete: boolean };
  next_question?: {
    id: string;
    prompt: string;
    type: QuestionType;
    required: boolean;
    options?: QuestionOption[];
    catalogCategories?: string[];
    hint?: string;
  } | null;
  recommendations_so_far: CreatorRecommendation[];
  warnings: string[];
  issues: AnswerIssue[];
}

export interface AgentGenerateResponse extends GeneratedAgentBundle {
  application_instructions: Record<string, string>;
}
