import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';

const ENV_EXAMPLE = '.env.example';

const sourceFiles = [
  'src/config.ts',
  'src/app.ts',
  'src/creator/router.ts',
  'src/middleware/auth.ts',
  'src/routes/metrics.ts',
  'src/server.ts',
  'src/logger.ts',
  'frontend/src/lib/api.ts',
  'frontend/src/app/layout.tsx',
  'frontend/src/app/robots.ts',
  'frontend/src/app/sitemap.ts',
];

const platformEnv = new Set(['NODE_ENV', 'VERCEL_ENV', 'npm_package_version']);

const legacyRuntimeEnv = [
  'AGENT_COOLDOWN_MS',
  'AGENT_MAX_PER_IP',
  'AGENT_TTL_MS',
  'ANTHROPIC_API_KEY',
  'EMBEDDING_RETRY_ATTEMPTS',
  'LLM_RETRY_DELAY_MS',
  'LLM_RETRY_MAX',
  'LLM_RETRY_MAX_DELAY_MS',
  'OPENAI_MODEL',
  'RAG_CHUNK_OVERLAP_CHARS',
  'SESSION_MAX_MESSAGES',
  'SESSION_TTL_MS',
];

function envExampleKeys() {
  const text = fs.readFileSync(ENV_EXAMPLE, 'utf8');
  const keys = new Set();

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = /^([A-Z0-9_]+)=/.exec(trimmed);
    if (match) keys.add(match[1]);
  }

  return keys;
}

function envKeysReadBySource() {
  const keys = new Set();

  for (const file of sourceFiles) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/process\.env\.([A-Za-z0-9_]+)/g)) keys.add(match[1]);
    for (const match of source.matchAll(/process\.env\[['"]([A-Za-z0-9_]+)['"]\]/g)) keys.add(match[1]);
    for (const match of source.matchAll(/envInt\(['"]([A-Za-z0-9_]+)['"]/g)) keys.add(match[1]);
  }

  for (const key of platformEnv) keys.delete(key);
  return keys;
}

describe('.env.example sync (#575)', () => {
  it('documents every product env key read by Creator and frontend config', () => {
    const documented = envExampleKeys();
    const readBySource = envKeysReadBySource();
    const missing = [...readBySource].filter((key) => !documented.has(key)).sort();

    assert.deepEqual(missing, []);
  });

  it('does not document removed Runtime-only env keys', () => {
    const documented = envExampleKeys();
    const stale = legacyRuntimeEnv.filter((key) => documented.has(key));

    assert.deepEqual(stale, []);
  });

  it('keeps the Creator-specific production knobs documented', () => {
    const documented = envExampleKeys();
    const requiredCreatorEnv = [
      'AUTH_REQUIRED',
      'CORS_ALLOWED_ORIGINS',
      'ARTEMISA_API_KEYS',
      'NEXT_PUBLIC_API_KEY',
      'NEXT_PUBLIC_API_URL',
      'RATE_LIMIT_CREATOR',
      'RATE_LIMIT_GLOBAL',
      'REQUEST_TIMEOUT_MS',
    ];

    for (const key of requiredCreatorEnv) {
      assert.ok(documented.has(key), `${key} must be documented in ${ENV_EXAMPLE}`);
    }
  });
});
