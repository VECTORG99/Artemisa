import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';

const readme = fs.readFileSync('README.md', 'utf8');

describe('README Creator auth documentation (#574)', () => {
  it('documents Creator auth env vars and accepted credential headers', () => {
    assert.match(readme, /^### Autenticacion del Creator$/m);
    assert.match(readme, /AUTH_REQUIRED=true/);
    assert.match(readme, /AUTH_REQUIRED=false/);
    assert.match(readme, /HUASCAR_API_KEYS/);
    assert.match(readme, /Authorization: Bearer/);
    assert.match(readme, /X-API-Key/);
  });

  it('documents public and protected Creator routes', () => {
    for (const route of [
      '/catalog',
      '/workflow',
      '/tutorial',
      '/agent',
      '/agent/start',
      '/agent/answer',
      '/agent/generate',
      '/startup',
    ]) {
      assert.match(readme, new RegExp(`\\| \`${route.replaceAll('/', '\\/')}\``));
    }

    for (const route of ['/evaluate', '/preview', '/generate']) {
      assert.match(readme, new RegExp(`\\| \`${route.replaceAll('/', '\\/')}\``));
    }
  });

  it('warns not to commit real API keys', () => {
    assert.match(readme, /no commitees claves\s+reales/);
  });
});
