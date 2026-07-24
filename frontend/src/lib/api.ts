import type { AgentConfig, AgentRole, HistoryRecord } from '@/types/agent';
import type {
  CreatorAnswers,
  CreatorCatalog,
  CreatorEvaluation,
  CreatorWorkflow,
  GeneratedAgentBundle,
  RegisteredAgent,
} from '@/types/creator';

export const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const apiKey = process.env.NEXT_PUBLIC_API_KEY || '';

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

export function authHeaders(): Record<string, string> {
  if (!apiKey) return {};
  return { Authorization: `Bearer ${apiKey}` };
}

export async function getRoles(): Promise<AgentRole[] | null> {
  const res = await fetch(`${apiUrl}/api/roles`, { headers: authHeaders() });
  if (!res.ok) return null;
  const data = await res.json();
  return Array.isArray(data?.roles) ? data.roles : null;
}

export async function getHistory(): Promise<HistoryRecord[]> {
  const res = await fetch(`${apiUrl}/api/history`, { headers: authHeaders() });
  const data = await res.json();
  return data.history || [];
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${apiUrl}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...options?.headers },
    ...options,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const error = data?.error;
    const message = typeof error === 'object' && error ? error.message : error;
    const issues = Array.isArray(data?.issues)
      ? ` ${data.issues
          .map((issue: { message?: string }) => issue.message)
          .filter(Boolean)
          .join(' ')}`
      : '';
    throw new Error(`${data?.title || message || data?.message || `Backend error ${res.status}`}${issues}`);
  }
  return data as T;
}

export function getCreatorCatalog() {
  return request<CreatorCatalog>('/api/v1/creator/catalog');
}

export function getCreatorWorkflow() {
  return request<CreatorWorkflow>('/api/v1/creator/workflow');
}

export function evaluateCreator(answers: CreatorAnswers, workflow: CreatorWorkflow) {
  return request<CreatorEvaluation>('/api/v1/creator/evaluate', {
    method: 'POST',
    body: JSON.stringify({ answers, workflowVersion: workflow.version, catalogVersion: workflow.catalogVersion }),
  });
}

export function generateCreator(answers: CreatorAnswers, workflow: CreatorWorkflow) {
  return request<GeneratedAgentBundle>('/api/v1/creator/generate', {
    method: 'POST',
    body: JSON.stringify({ answers, workflowVersion: workflow.version, catalogVersion: workflow.catalogVersion }),
  });
}

export function registerAgent(name: string, config: AgentConfig) {
  return request<RegisteredAgent>('/api/agents', {
    method: 'POST',
    body: JSON.stringify({ name, config }),
  });
}
