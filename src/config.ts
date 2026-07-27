import 'dotenv/config';

function envInt(key: string, fallback: number): number {
  const v = process.env[key];
  if (v === undefined) return fallback;
  const n = parseInt(v, 10);
  return isNaN(n) || n < 0 ? fallback : n;
}

/**
 * Backend configuration (#584).
 * Artemisa only generates configuration files: there is no database, LLM
 * provider, MCP pool or RAG index left to configure. Auth env is read by
 * `src/middleware/auth.ts`; rate limits are read in `src/app.ts`.
 */
export const config = {
  server: {
    port: envInt('PORT', 3001),
    host: process.env.HOST || '0.0.0.0',
    requestTimeoutMs: envInt('REQUEST_TIMEOUT_MS', 120000),
  },
};
