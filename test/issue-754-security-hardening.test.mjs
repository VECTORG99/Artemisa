import assert from 'node:assert/strict';
import fs from 'node:fs';
import { afterEach, describe, it } from 'node:test';

import { deriveBaseUrl } from '../src/creator/router.js';
import { singleLine } from '../src/creator/generator.js';
import { listDocumentationFiles } from '../src/creator/docs-catalog.js';
import { ErrorCodes } from '../src/errors.js';

// Issue #754: the public surface trusted client-controlled input in several
// places (any .md below cwd, forged Host headers, proxy IPs) and reported CORS
// rejections as server faults.

/** Minimal Express-request stand-in: only `get` and `protocol` are used. */
function fakeRequest(headers = {}, protocol = 'http') {
  const lower = new Map(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
  return {
    protocol,
    get(name) {
      return lower.get(name.toLowerCase());
    },
  };
}

describe('deriveBaseUrl host trust (issue #754)', () => {
  afterEach(() => {
    delete process.env.PUBLIC_BASE_URL;
  });

  it('PUBLIC_BASE_URL wins over any forged header', () => {
    process.env.PUBLIC_BASE_URL = 'https://api.artemisa.dev/';
    const req = fakeRequest({ host: 'evil.com', 'X-Forwarded-Host': 'evil.com', Origin: 'https://evil.com' });
    assert.equal(deriveBaseUrl(req), 'https://api.artemisa.dev/api/v1/creator');
  });

  it('ignores a forwarded host that is not a hostname', () => {
    const req = fakeRequest({ 'X-Forwarded-Host': 'evil.com/path?x=1', host: 'api.example.com' });
    assert.equal(deriveBaseUrl(req), 'https://api.example.com/api/v1/creator');
  });

  it('reduces the Origin header to scheme://host', () => {
    const req = fakeRequest({ Origin: 'https://app.example.com/attacker/path', host: 'api.example.com' });
    assert.equal(deriveBaseUrl(req), 'https://app.example.com/api/v1/creator');
  });

  it('ignores a non-http Origin scheme', () => {
    const req = fakeRequest({ Origin: 'javascript:alert(1)', host: 'api.example.com' });
    assert.equal(deriveBaseUrl(req), 'https://api.example.com/api/v1/creator');
  });

  it('ignores an unknown X-Forwarded-Proto value', () => {
    const req = fakeRequest({ host: 'api.example.com', 'X-Forwarded-Proto': 'gopher' });
    assert.equal(deriveBaseUrl(req), 'https://api.example.com/api/v1/creator');
  });
});

describe('docs content allowlist (issue #754)', () => {
  it('the catalog never lists paths outside the documented roots', () => {
    for (const doc of listDocumentationFiles()) {
      assert.ok(!doc.path.includes('..'), `${doc.path} must not traverse`);
      assert.ok(doc.path.endsWith('.md'), `${doc.path} must be markdown`);
      assert.ok(
        /^(?:[^/]+\.md|docs\/(?:adr\/|reference\/)?[^/]+\.md)$/.test(doc.path),
        `${doc.path} outside doc roots`,
      );
    }
  });

  it('markdown that is not part of the catalog is not served', () => {
    const allowed = new Set(listDocumentationFiles().map((doc) => doc.path));
    for (const path of ['frontend/README.md', 'e2e/README.md', 'node_modules/express/Readme.md', 'private.md']) {
      assert.equal(allowed.has(path), false, `${path} must not be reachable`);
    }
    assert.equal(allowed.has('README.md'), true);
  });

  it('root scope only lists curated documents, not stray markdown', () => {
    const root = 'test/fixtures-754';
    fs.mkdirSync(`${root}/docs`, { recursive: true });
    try {
      fs.writeFileSync(`${root}/README.md`, '# readme\n');
      fs.writeFileSync(`${root}/private-notes.md`, 'secret\n');
      fs.writeFileSync(`${root}/docs/architecture.md`, '# arch\n');
      const paths = listDocumentationFiles(root).map((doc) => doc.path);
      assert.deepEqual(paths, ['README.md', 'docs/architecture.md']);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('the route checks the catalog before reading from disk', () => {
    const source = fs.readFileSync('src/creator/router.ts', 'utf8');
    const guard = source.indexOf('listDocumentationFiles().some');
    const read = source.indexOf('fs.readFile(filePath');
    assert.ok(guard > 0 && guard < read, 'allowlist check must precede the file read');
  });
});

describe('CORS rejection status (issue #754)', () => {
  it('a blocked origin is a 403, not a 500', () => {
    const source = fs.readFileSync('src/app.ts', 'utf8');
    assert.match(source, /ApiError\(ErrorCodes\.API_CORS_FORBIDDEN, 'Origin not allowed by CORS', 403\)/);
    assert.equal(source.includes('callback(new Error('), false);
    assert.equal(ErrorCodes.API_CORS_FORBIDDEN, 'API_CORS_FORBIDDEN');
  });
});

describe('trust proxy configuration (issue #754)', () => {
  it('is opt-in via TRUST_PROXY and documented', () => {
    const source = fs.readFileSync('src/app.ts', 'utf8');
    assert.match(source, /process\.env\.TRUST_PROXY/);
    assert.match(source, /app\.set\('trust proxy'/);
    assert.match(fs.readFileSync('.env.example', 'utf8'), /^TRUST_PROXY=$/m);
    assert.match(fs.readFileSync('.do/app.yaml', 'utf8'), /key: TRUST_PROXY/);
  });

  it('PUBLIC_BASE_URL is bound in the DigitalOcean spec', () => {
    const appYaml = fs.readFileSync('.do/app.yaml', 'utf8');
    assert.match(appYaml, /key: PUBLIC_BASE_URL\n\s+value: \$\{APP_URL\}/);
  });
});

describe('singleLine (issue #754)', () => {
  it('prevents a free-text answer from injecting YAML lines', () => {
    assert.equal(singleLine('Agent\nkey: injected'), 'Agent key: injected');
    assert.equal(singleLine('  Agent\r\n\tName  '), 'Agent Name');
    assert.equal(singleLine('Plain Name'), 'Plain Name');
  });
});

describe('logger redaction (issue #754)', () => {
  it('redacts credential fields', () => {
    const source = fs.readFileSync('src/logger.ts', 'utf8');
    assert.match(source, /redact:/);
    for (const path of ['req.headers.authorization', 'ARTEMISA_API_KEYS', 'METRICS_SECRET', "'*.token'"]) {
      assert.ok(source.includes(path), `${path} must be redacted`);
    }
  });
});
