import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

// Issue #712: the Playwright specs under frontend/e2e were the only coverage
// of the Creator flow against a live backend, and no workflow ran them. These
// tests pin the CI wiring and the config contract the job depends on.

const ROOT = path.resolve(import.meta.dirname, '..');
const EXTENDED = fs.readFileSync(path.join(ROOT, '.github/workflows/ci-extended.yml'), 'utf8');
const CI = fs.readFileSync(path.join(ROOT, '.github/workflows/ci.yml'), 'utf8');
const PW_CONFIG = fs.readFileSync(path.join(ROOT, 'frontend/playwright.config.ts'), 'utf8');

/** Extracts a top-level job block (2-space indented key) from a workflow. */
function jobBlock(workflow, job) {
  const start = workflow.indexOf(`\n  ${job}:\n`);
  if (start === -1) return null;
  const rest = workflow.slice(start + 1);
  const next = rest.slice(1).search(/\n {2}[a-z][a-z0-9-]*:\n/);
  return next === -1 ? rest : rest.slice(0, next + 1);
}

describe('CI Extended runs the Playwright e2e suite (issue #712)', () => {
  const e2e = jobBlock(EXTENDED, 'e2e');

  it('defines an e2e job in ci-extended, not in ci.yml', () => {
    assert.ok(e2e, 'ci-extended.yml must define an `e2e` job');
    // Browser download plus a Next build must not be paid on every PR.
    assert.doesNotMatch(CI, /playwright/i);
  });

  it('installs the chromium browser with its system deps', () => {
    assert.match(e2e, /npx playwright install --with-deps chromium/);
    assert.match(e2e, /working-directory: frontend/);
  });

  it('builds the frontend with the local backend URL baked in', () => {
    assert.match(e2e, /npm --prefix frontend run build/);
    assert.match(e2e, /NEXT_PUBLIC_API_URL: http:\/\/localhost:3001/);
  });

  it('starts the backend and waits for its health endpoint', () => {
    assert.match(e2e, /AUTH_REQUIRED=false PORT=3001 npm run start/);
    assert.match(e2e, /curl -sf http:\/\/localhost:3001\/api\/health/);
  });

  it('runs the e2e suite through the frontend script', () => {
    assert.match(e2e, /npm --prefix frontend run test:e2e/);
  });

  it('is blocking: no continue-on-error on the e2e job', () => {
    assert.doesNotMatch(e2e, /continue-on-error/);
  });

  it('uploads the Playwright report as an artifact when it fails', () => {
    assert.match(e2e, /if: failure\(\)/);
    assert.match(e2e, /actions\/upload-artifact@v4/);
    assert.match(e2e, /name: playwright-report/);
    assert.match(e2e, /frontend\/playwright-report\//);
  });
});

describe('Playwright config supports the CI job', () => {
  it('emits an HTML report in CI so the artifact has content', () => {
    assert.match(PW_CONFIG, /\['html', \{ open: 'never' \}\]/);
    assert.match(PW_CONFIG, /\['github'\]/);
  });

  it('serves the production build on a fixed port in CI', () => {
    assert.match(PW_CONFIG, /process\.env\.CI \? 'npm run start -- --port 3000'/);
    assert.match(PW_CONFIG, /url: 'http:\/\/localhost:3000'/);
    assert.match(PW_CONFIG, /reuseExistingServer: !process\.env\.CI/);
  });

  it('keeps forbidOnly in CI so a stray test.only cannot narrow the run', () => {
    assert.match(PW_CONFIG, /forbidOnly: !!process\.env\.CI/);
  });
});

describe('frontend e2e specs', () => {
  const dir = path.join(ROOT, 'frontend/e2e');

  it('exist and are wired to the test:e2e script', () => {
    const specs = fs.readdirSync(dir).filter((file) => file.endsWith('.spec.ts'));
    assert.ok(specs.length >= 2, 'expected the creator and navigation specs');
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'frontend/package.json'), 'utf8'));
    assert.match(pkg.scripts['test:e2e'], /playwright test/);
  });

  it('are not skipped: every spec runs in CI', () => {
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.spec.ts'))) {
      const source = fs.readFileSync(path.join(dir, file), 'utf8');
      assert.doesNotMatch(source, /test\.skip\(|test\.describe\.skip\(|test\.only\(/, `${file} must not skip tests`);
    }
  });
});
