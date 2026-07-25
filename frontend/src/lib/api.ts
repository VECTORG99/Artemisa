import type {
  ApiProblem,
  Catalog,
  CreatorAnswers,
  DecisionEvaluation,
  EvaluateRequest,
  ExecuteRequest,
  ExecuteResponse,
  GeneratedAgentBundle,
  HealthResponse,
  McpCatalogResponse,
  PreviewRequest,
  SkillsCatalogResponse,
  Tutorial,
  Workflow,
} from '@huascar/types';
import type { AgentConfig, AgentRole, HistoryRecord } from '@/types/agent';

// ─── Config ───────────────────────────────────────────────────────────────────

export const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const apiKey = process.env.NEXT_PUBLIC_API_KEY || '';

const CREATOR_BASE = `${apiUrl}/api/v1/creator`;
const RUNTIME_BASE = `${apiUrl}/api`;

// Warn in development if API URL points to a non-local address
if (
  typeof window !== 'undefined' &&
  process.env.NODE_ENV === 'development' &&
  apiUrl &&
  !apiUrl.includes('localhost') &&
  !apiUrl.includes('127.0.0.1')
) {
  console.warn(
    `[Huascar] NEXT_PUBLIC_API_URL points to a non-local address (${apiUrl}). ` +
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

  evaluate: (answers: CreatorAnswers, versions: { workflowVersion: string; catalogVersion: string }) =>
    request<DecisionEvaluation>(`${CREATOR_BASE}/evaluate`, {
      method: 'POST',
      body: JSON.stringify({
        answers,
        workflowVersion: versions.workflowVersion,
        catalogVersion: versions.catalogVersion,
      } satisfies EvaluateRequest),
    }),

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

// ─── Runtime / Dashboard API ──────────────────────────────────────────────────

export const runtime = {
  health: () => request<HealthResponse>(`${RUNTIME_BASE}/health`),

  execute: (payload: ExecuteRequest) =>
    request<ExecuteResponse>(`${RUNTIME_BASE}/agent/execute`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  history: () => request<{ history: HistoryRecord[] }>(`${RUNTIME_BASE}/history`).then((r) => r.history),
};

export async function getRoles(): Promise<AgentRole[] | null> {
  const res = await fetch(`${RUNTIME_BASE}/roles`, { headers: authHeaders() });
  if (!res.ok) return null;
  const data = await res.json();
  return Array.isArray(data?.roles) ? data.roles : null;
}

export async function getHistory(): Promise<HistoryRecord[]> {
  const res = await fetch(`${RUNTIME_BASE}/history`, { headers: authHeaders() });
  const data = await res.json();
  return data.history || [];
}

export function registerAgent(name: string, config: AgentConfig) {
  return request<{ id: string; name: string; config?: unknown }>(`${RUNTIME_BASE}/agents`, {
    method: 'POST',
    body: JSON.stringify({ name, config }),
  });
}
