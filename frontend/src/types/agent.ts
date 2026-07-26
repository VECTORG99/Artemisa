export interface AgentConfig {
  steering?: {
    role?: string;
    system_prompt?: string;
    roles?:
      | Record<string, { name?: string; prompt?: string; system_prompt?: string }>
      | { id: string; prompt?: string; system_prompt?: string }[];
  };
  rag?: { sources?: unknown[] };
  mcps?: string[];
  hooks?: string[];
  tools?: string[];
  knowledge?: unknown[];
}
