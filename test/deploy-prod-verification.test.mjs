import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  DEFAULT_SITE,
  isCommitMarker,
  markerMatchesCommit,
  parseArgs,
  parseSwVersion,
} from '../scripts/verify-prod-deploy.mjs';

// Issue #710: production served a bundle older than master and there was no
// way to detect it. The build marker (`/sw-version.js`) plus this verifier are
// that way; the docs section is the runbook.

const ROOT = path.resolve(import.meta.dirname, '..');

describe('deployed build marker', () => {
  it('parses the marker written by write-sw-version.mjs', () => {
    assert.equal(parseSwVersion('self.ARTEMISA_SW_VERSION = "3ac4ab4";\n'), '3ac4ab4');
    assert.equal(parseSwVersion('nothing here'), null);
    assert.equal(parseSwVersion(undefined), null);
  });

  it('treats a version+timestamp fallback as unverifiable', () => {
    // This is exactly what production served while #710 was open.
    assert.equal(isCommitMarker('0.1.0-1785202857704'), false);
    assert.equal(isCommitMarker('dev-123'), false);
    assert.equal(isCommitMarker('3ac4ab4'), true);
    assert.equal(isCommitMarker('3ac4ab4270429e698584d846837de74fa9a787d7'), true);
  });

  it('matches short markers against full commit SHAs', () => {
    const full = '3ac4ab4270429e698584d846837de74fa9a787d7';
    assert.equal(markerMatchesCommit('3ac4ab4', full), true);
    assert.equal(markerMatchesCommit(full, full), true);
    assert.equal(markerMatchesCommit('3AC4AB4', full), true);
    assert.equal(markerMatchesCommit('1f1cc5d', full), false);
    assert.equal(markerMatchesCommit('0.1.0-1785202857704', full), false);
    assert.equal(markerMatchesCommit(null, full), false);
  });

  it('defaults to the production site and origin/master', () => {
    assert.equal(DEFAULT_SITE, 'https://artemisa-ai.netlify.app');
    assert.deepEqual(parseArgs([]), { url: DEFAULT_SITE, ref: 'origin/master' });
    assert.deepEqual(parseArgs(['--ref', 'origin/development']), {
      url: DEFAULT_SITE,
      ref: 'origin/development',
    });
    assert.deepEqual(parseArgs(['--url', 'https://staging.example.com/']), {
      url: 'https://staging.example.com',
      ref: 'origin/master',
    });
    assert.throws(() => parseArgs(['--nope', 'x']), /unknown option/);
    assert.throws(() => parseArgs(['--ref']), /missing value/);
  });
});

describe('write-sw-version.mjs records the deploying commit', () => {
  const source = fs.readFileSync(path.join(ROOT, 'frontend/scripts/write-sw-version.mjs'), 'utf8');

  it("reads Netlify's COMMIT_REF first", () => {
    const order = [...source.matchAll(/process\.env\.([A-Z_]+)/g)].map((m) => m[1]);
    assert.equal(order[0], 'COMMIT_REF');
    for (const variable of ['VERCEL_GIT_COMMIT_SHA', 'GITHUB_SHA', 'COMMIT_SHA']) {
      assert.ok(order.includes(variable), `${variable} must stay in the fallback chain`);
    }
  });

  it('keeps a local fallback so builds never fail without the env vars', () => {
    assert.match(source, /npm_package_version \|\| 'dev'/);
  });

  it('runs on prebuild so every deployed build has a marker', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'frontend/package.json'), 'utf8'));
    assert.match(pkg.scripts.prebuild, /write-sw-version\.mjs/);
  });
});

describe('docs/deployment.md documents the production check', () => {
  const docs = fs.readFileSync(path.join(ROOT, 'docs/deployment.md'), 'utf8');

  it('has a section on verifying production against master', () => {
    assert.match(docs, /Verifying Production Matches `master`/);
  });

  it('documents the marker request and the verifier script', () => {
    assert.match(docs, /sw-version\.js\?cachebust=/);
    assert.match(docs, /node scripts\/verify-prod-deploy\.mjs/);
    assert.match(docs, /COMMIT_REF/);
  });

  it('documents the content spot-check with a cache buster', () => {
    assert.match(docs, /cachebust=\$RANDOM/);
    // Issue #738: the example must grep a string that is in the server-rendered
    // HTML. Client-component test ids never are, so citing one made the runbook
    // report a healthy deployment as stale.
    assert.match(docs, /grep -o 'blur\(9px\)' \| wc -l/);
    assert.match(docs, /client components/i);
    assert.doesNotMatch(docs, /grep -c 'value-prop-card'/);
  });

  it('points at the marker check as the authoritative one', () => {
    assert.match(docs, /authoritative check/i);
  });

  it('documents how to force a rebuild and why NEXT_PUBLIC_* needs one', () => {
    assert.match(docs, /Clear cache and deploy site/);
    assert.match(docs, /NEXT_PUBLIC_\*.*baked at build time/);
  });

  it('documents the Vercel preview provider decision', () => {
    assert.match(docs, /Vercel/);
    assert.match(docs, /rate limit/i);
    assert.match(docs, /deploymentEnabled/);
  });
});

describe('Vercel git deployments are disabled from the repo (issue #710)', () => {
  // Vercel reads vercel.json from the project's Root Directory, which may be
  // the repo root, frontend/ or agent-creator/; every candidate keeps the
  // check off, and a new vercel.json without the flag fails here (issue #728).
  const configs = ['vercel.json', 'frontend/vercel.json', 'agent-creator/vercel.json'];

  it('covers every vercel.json in the repository', () => {
    const found = [];
    const walk = (dir, prefix = '') => {
      for (const entry of fs.readdirSync(path.join(ROOT, dir === '' ? '.' : dir), { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.next')) continue;
        const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) walk(relative, relative);
        else if (entry.name === 'vercel.json') found.push(relative);
      }
    };
    walk('');
    assert.deepEqual(found.sort(), [...configs].sort());
  });

  for (const file of configs) {
    it(`${file} disables automatic git deployments`, () => {
      const config = JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
      assert.equal(config.git.deploymentEnabled, false);
      assert.equal(config.$schema, 'https://openapi.vercel.sh/vercel.json');
    });
  }

  it('keeps the agent-creator build configuration intact', () => {
    const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'agent-creator/vercel.json'), 'utf8'));
    assert.equal(config.framework, 'vite');
    assert.equal(config.buildCommand, 'npm run build');
    assert.equal(config.outputDirectory, 'dist');
    assert.deepEqual(config.rewrites, [{ source: '/(.*)', destination: '/index.html' }]);
  });
});
