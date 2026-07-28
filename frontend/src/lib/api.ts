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

  const raw = await response.text();
  let data: unknown = null;
  let parseFailed = false;
  if (raw.length > 0) {
    try {
      data = JSON.parse(raw);
    } catch {
      parseFailed = true;
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, parseFailed ? null : (data as ApiProblem | null));
  }

  // A successful response with a body the API contract cannot describe used to
  // resolve as `null`, which surfaced far from the cause as "cannot read
  // property of null" inside the Creator.
  if (parseFailed || raw.length === 0) {
    throw new ApiError(response.status, null, `Invalid JSON response from ${url}`);
  }

  return data as T;
}

// ─── Creator API ──────────────────────────────────────────────────────────────

export const creator = {
  getCatalog: () => request<Catalog>(`${CREATOR_BASE}/catalog`),

  getWorkflow: () => request<Workflow>(`${CREATOR_BASE}/workflow`),

  getTutorial: () => request<Tutorial>(`${CREATOR_BASE}/tutorial`),

  getSkills: (filter?: { focus?: string; q?: string }) => {
    const params = new URLSearchParams();
    if (filter?.focus) params.set('focus', filter.focus);
    if (filter?.q) params.set('q', filter.q);
    const qs = params.toString();
    return request<SkillsCatalogResponse>(`${CREATOR_BASE}/skills${qs ? `?${qs}` : ''}`);
  },

  getMcps: (filter?: { category?: string; q?: string }) => {
    const params = new URLSearchParams();
    if (filter?.category) params.set('category', filter.category);
    if (filter?.q) params.set('q', filter.q);
    const qs = params.toString();
    return request<McpCatalogResponse>(`${CREATOR_BASE}/mcps${qs ? `?${qs}` : ''}`);
  },

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
        body: JSON.stringify({
          answers,
          workflowVersion: versions.workflowVersion,
          catalogVersion: versions.catalogVersion,
        } satisfies EvaluateRequest),
      })
        .catch((err: unknown) => {
          // A failed evaluation must not be memoized: retrying the same answers
          // has to hit the network again instead of replaying the rejection.
          if (lastKey === key) {
            lastKey = '';
            lastPromise = null;
          }
          throw err;
        })
        .finally(() => {
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
      body: JSON.stringify({
        answers,
        workflowVersion: versions.workflowVersion,
        catalogVersion: versions.catalogVersion,
      } satisfies PreviewRequest),
    }),

  generate: (answers: CreatorAnswers, versions: { workflowVersion: string; catalogVersion: string }) =>
    request<GeneratedAgentBundle>(`${CREATOR_BASE}/generate`, {
      method: 'POST',
      body: JSON.stringify({
        answers,
        workflowVersion: versions.workflowVersion,
        catalogVersion: versions.catalogVersion,
      } satisfies PreviewRequest),
    }),
};
