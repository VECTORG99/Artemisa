import type {
  ApiProblem,
  Catalog,
  CreatorAnswers,
  DecisionEvaluation,
  EvaluateRequest,
  GeneratedAgentBundle,
  McpCatalogResponse,
  PreviewRequest,
  SkillsCatalogResponse,
  Tutorial,
  Workflow,
} from '@artemisa/types';
// ─── Config ───────────────────────────────────────────────────────────────────

export const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const apiKey = process.env.NEXT_PUBLIC_API_KEY || '';

const CREATOR_BASE = `${apiUrl}/api/v1/creator`;

// Warn in development if API URL points to a non-local address
if (
  typeof window !== 'undefined' &&
  process.env.NODE_ENV === 'development' &&
  apiUrl &&
  !apiUrl.includes('localhost') &&
  !apiUrl.includes('127.0.0.1')
) {
  console.warn(
    `[Artemisa] NEXT_PUBLIC_API_URL points to a non-local address (${apiUrl}). ` +
      'This may send development traffic to production. Set NEXT_PUBLIC_API_URL=http://localhost:3001 in your .env.local',
  );
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export function authHeaders(): Record<string, string> {
  if (!apiKey) return {};
  return { Authorization: `Bearer ${apiKey}` };
}

// ─── Error ────────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  readonly status: number;
  readonly problem: ApiProblem | null;

  constructor(status: number, problem: ApiProblem | null, message?: string) {
    super(message || problem?.title || `Request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
  }
}

// ─── Fetch wrapper ────────────────────────────────────────────────────────────

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...options?.headers },
    ...options,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(response.status, data as ApiProblem | null);
  }

  return data as T;
}

/** Append the defined filter values as a query string. */
function withQuery(url: string, filter?: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filter ?? {})) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

/** Body shared by the evaluate/preview/generate endpoints. */
function creatorBody(
  answers: CreatorAnswers,
  versions: { workflowVersion: string; catalogVersion: string },
): EvaluateRequest & PreviewRequest {
  return { answers, workflowVersion: versions.workflowVersion, catalogVersion: versions.catalogVersion };
}

// ─── Creator API ──────────────────────────────────────────────────────────────

export const creator = {
  getCatalog: () => request<Catalog>(`${CREATOR_BASE}/catalog`),

  getWorkflow: () => request<Workflow>(`${CREATOR_BASE}/workflow`),

  getTutorial: () => request<Tutorial>(`${CREATOR_BASE}/tutorial`),

  getSkills: (filter?: { focus?: string; q?: string }) =>
    request<SkillsCatalogResponse>(withQuery(`${CREATOR_BASE}/skills`, filter)),

  getMcps: (filter?: { category?: string; q?: string }) =>
    request<McpCatalogResponse>(withQuery(`${CREATOR_BASE}/mcps`, filter)),

  evaluate: (() => {
    // #409: the Creator re-evaluates the decision tree on every step and on
    // back/forth navigation, often with the same accumulated answers. Two
    // optimizations that avoid redundant POSTs:
    //  - lastResult: if the same answers+versions were just evaluated, return
    //    the cached promise without a network call (common on back navigation).
    //  - inFlight: if a request for the same key is already running, reuse its
    //    promise instead of firing a duplicate (rapid clicks / double submit).
    let lastKey = '';
    let lastPromise: Promise<DecisionEvaluation> | null = null;
    const inFlight = new Map<string, Promise<DecisionEvaluation>>();

    function keyFor(answers: CreatorAnswers, versions: { workflowVersion: string; catalogVersion: string }): string {
      return `${versions.workflowVersion}|${versions.catalogVersion}|${JSON.stringify(answers)}`;
    }

    return (answers: CreatorAnswers, versions: { workflowVersion: string; catalogVersion: string }) => {
      const key = keyFor(answers, versions);
      if (lastKey === key && lastPromise) return lastPromise;
      const running = inFlight.get(key);
      if (running) return running;
      const p = request<DecisionEvaluation>(`${CREATOR_BASE}/evaluate`, {
        method: 'POST',
        body: JSON.stringify(creatorBody(answers, versions)),
      }).finally(() => {
        inFlight.delete(key);
      });
      inFlight.set(key, p);
      lastKey = key;
      lastPromise = p;
      return p;
    };
  })(),

  preview: (answers: CreatorAnswers, versions: { workflowVersion: string; catalogVersion: string }) =>
    request<GeneratedAgentBundle>(`${CREATOR_BASE}/preview`, {
      method: 'POST',
      body: JSON.stringify(creatorBody(answers, versions)),
    }),

  generate: (answers: CreatorAnswers, versions: { workflowVersion: string; catalogVersion: string }) =>
    request<GeneratedAgentBundle>(`${CREATOR_BASE}/generate`, {
      method: 'POST',
      body: JSON.stringify(creatorBody(answers, versions)),
    }),
};
