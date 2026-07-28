import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

// Issue #729: the Format check ran with `continue-on-error: true`, so nothing
// enforced it and the repo drifted to 29 unformatted files. These tests pin the
// blocking step and the ignore list so the escape hatch cannot come back.

const ROOT = path.resolve(import.meta.dirname, '..');
const CI = fs.readFileSync(path.join(ROOT, '.github/workflows/ci.yml'), 'utf8');

/** Extracts a top-level job block (2-space indented key) from the workflow. */
function jobBlock(workflow, job) {
  const start = workflow.indexOf(`\n  ${job}:\n`);
  if (start === -1) return null;
  const rest = workflow.slice(start + 1);
  const next = rest.slice(1).search(/\n {2}[a-z][a-z0-9-]*:\n/);
  return next === -1 ? rest : rest.slice(0, next + 1);
}

describe('CI format check is blocking (issue #729)', () => {
  const lint = jobBlock(CI, 'lint');

  it('runs prettier --check in the lint job', () => {
    assert.ok(lint, 'ci.yml must define a `lint` job');
    assert.match(lint, /npx prettier --check \./);
  });

  it('has no continue-on-error escape hatch left in the job', () => {
    // Matches the YAML key, not the word in a comment.
    assert.doesNotMatch(lint, /continue-on-error:/);
  });

  it('still type-checks the backend in the same job', () => {
    assert.match(lint, /npx tsc --noEmit/);
  });
});

describe('.prettierignore', () => {
  const entries = fs
    .readFileSync(path.join(ROOT, '.prettierignore'), 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

  it('ignores the generated service-worker version file', () => {
    // write-sw-version.mjs rewrites it on every build with its own formatting,
    // so formatting it here would break the check on the next prebuild.
    assert.ok(entries.includes('frontend/public/sw-version.js'));
  });

  it('keeps ignoring the license texts and build output', () => {
    for (const entry of ['LICENSE', 'NOTICE', 'node_modules', '.next', 'package-lock.json']) {
      assert.ok(entries.includes(entry), `.prettierignore must list ${entry}`);
    }
  });
});
