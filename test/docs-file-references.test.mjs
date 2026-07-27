import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

// Issue #573: documentation must not reference files that no longer exist.
// This test scans key docs for `src/...` and `frontend/src/...` paths and
// verifies they exist on disk. ADR files are excluded (they are historical).

const DOCS_TO_SCAN = [
  'README.md',
  'docs/CONTRIBUTING.md',
  'AGENTS.md',
  'CONTEXT.md',
  'docs/deployment.md',
  'docs/architecture.md',
  'docs/debug-tooling.md',
  'docs/CONVENTIONS.md',
];

// Match `src/...` or `frontend/src/...` or `agent-creator/src/...` paths in
// backticks or plain text. Skip paths inside ADR references (adr/...).
const PATH_REGEX =
  /(?<![a-zA-Z0-9/_-])((?:src|frontend\/src|agent-creator\/src)\/[a-zA-Z0-9/_-]+\.(?:ts|tsx|js|jsx|mjs|json))(?![a-zA-Z0-9/_-])/g;

// Files known to have been removed; if cited, the test fails.
const REMOVED_FILES = [
  'src/engine/init.ts',
  'src/engine/ArtemisaEngine.ts',
  'src/engine/RagEngine.ts',
  'src/engine/Store.ts',
  'src/security/PolicyEngine.ts',
  'src/security/AuditLog.ts',
  'frontend/src/components/ErrorBoundary.tsx',
  'frontend/src/hooks/use-keyboard-shortcut.ts',
  'frontend/src/types/creator.ts',
  'frontend/src/types/agent.ts',
  'agent-creator/vitest.config.ts',
];

describe('docs reference only existing files (#573)', () => {
  for (const docPath of DOCS_TO_SCAN) {
    if (!fs.existsSync(docPath)) continue;
    const content = fs.readFileSync(docPath, 'utf8');

    it(`${docPath} does not cite removed files`, () => {
      for (const removed of REMOVED_FILES) {
        assert.ok(!content.includes(removed), `${docPath} references removed file: ${removed}`);
      }
    });

    it(`${docPath} cited src paths exist on disk`, () => {
      const matches = [...content.matchAll(PATH_REGEX)].map((m) => m[1]);
      const missing = matches.filter((p) => !fs.existsSync(p));
      // De-duplicate for cleaner output
      const uniqueMissing = [...new Set(missing)];
      assert.deepEqual(uniqueMissing, [], `${docPath} cites non-existent source paths: ${uniqueMissing.join(', ')}`);
    });
  }

  it('docs do not instruct running npm ci inside subdirectories', () => {
    for (const docPath of ['docs/deployment.md', 'README.md', 'docs/CONTRIBUTING.md']) {
      if (!fs.existsSync(docPath)) continue;
      const content = fs.readFileSync(docPath, 'utf8');
      // Look for patterns like "cd frontend && npm ci" or "cd ../agent-creator && npm ci"
      assert.ok(
        !/cd\s+\S+\s*&&\s*npm\s+ci/.test(content),
        `${docPath} instructs running 'npm ci' inside a subdirectory — use root-level npm ci (npm workspaces).`,
      );
    }
  });

  it('docs do not reference src/engine/init.ts for DB initialization', () => {
    for (const docPath of DOCS_TO_SCAN) {
      if (!fs.existsSync(docPath)) continue;
      const content = fs.readFileSync(docPath, 'utf8');
      assert.ok(
        !content.includes('src/engine/init.ts'),
        `${docPath} references src/engine/init.ts which was removed in #584.`,
      );
    }
  });
});
