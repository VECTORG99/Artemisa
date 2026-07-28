import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

// Issue #709: the frontend Vitest suite and the frontend tsconfig were never
// exercised by any workflow, so UI regressions reached development and master
// unchecked. These tests pin the CI wiring (a workflow file is config, and
// config regressions are silent otherwise).

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

describe('CI runs the frontend checks (issue #709)', () => {
  const frontend = jobBlock(CI, 'frontend-test');

  it('defines a frontend-test job', () => {
    assert.ok(frontend, 'ci.yml must define a `frontend-test` job');
  });

  it('runs the frontend Vitest suite', () => {
    assert.match(frontend, /npm --prefix frontend run test\b/);
  });

  it('runs the frontend type check with the frontend tsconfig', () => {
    assert.match(frontend, /npm --prefix frontend run typecheck/);
  });

  it('installs dependencies from the workspace root lockfile with npm cache', () => {
    assert.match(frontend, /npm ci/);
    assert.match(frontend, /cache: npm/);
  });

  it('is blocking: no continue-on-error escape hatch', () => {
    assert.doesNotMatch(frontend, /continue-on-error/);
  });

  it('runs on pushes and pull requests for master and development', () => {
    const triggers = CI.slice(0, CI.indexOf('\njobs:'));
    assert.match(triggers, /push:/);
    assert.match(triggers, /pull_request:/);
    assert.match(triggers, /branches: \[master, development\]/);
  });
});

describe('frontend package exposes the scripts CI calls', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'frontend/package.json'), 'utf8'));

  it('has a test script running vitest', () => {
    assert.match(pkg.scripts.test, /vitest run/);
  });

  it('has a typecheck script running tsc --noEmit', () => {
    assert.match(pkg.scripts.typecheck, /tsc --noEmit/);
  });
});
