import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { deriveBaseUrl } from '../src/creator/router.js';
import { getAgentProtocol, getStartupDocument } from '../src/creator/agentProtocol.js';

// Issue #719: behind DigitalOcean's TLS-terminating proxy `req.protocol` is
// `http`, so the onboarding prompt handed agents `http://` URLs that answer
// 301 to `https://`: an insecure first hop, a redirect per step, and a mixed
// content risk when the agent runs from a secure context.

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

describe('deriveBaseUrl (issue #719)', () => {
  it('uses https for a proxied production host', () => {
    const req = fakeRequest({ host: 'artemisa-gyof3.ondigitalocean.app', 'X-Forwarded-Proto': 'https' });
    assert.equal(deriveBaseUrl(req), 'https://artemisa-gyof3.ondigitalocean.app/api/v1/creator');
  });

  it('defaults to https for a remote host even without X-Forwarded-Proto', () => {
    // DigitalOcean does not always forward the protocol header; a public host
    // must never be advertised over plain http.
    const req = fakeRequest({ host: 'artemisa-gyof3.ondigitalocean.app' });
    assert.equal(deriveBaseUrl(req), 'https://artemisa-gyof3.ondigitalocean.app/api/v1/creator');
  });

  it('takes the client-facing protocol from a proxy chain', () => {
    const req = fakeRequest({ host: 'api.example.com', 'X-Forwarded-Proto': 'https, http' });
    assert.equal(deriveBaseUrl(req), 'https://api.example.com/api/v1/creator');
  });

  it('honours X-Forwarded-Host with its protocol', () => {
    const req = fakeRequest({
      host: 'internal:3001',
      'X-Forwarded-Host': 'api.artemisa.dev',
      'X-Forwarded-Proto': 'https',
    });
    assert.equal(deriveBaseUrl(req), 'https://api.artemisa.dev/api/v1/creator');
  });

  it('defaults a forwarded host to https when the protocol header is missing', () => {
    const req = fakeRequest({ host: 'internal:3001', 'X-Forwarded-Host': 'api.artemisa.dev' });
    assert.equal(deriveBaseUrl(req), 'https://api.artemisa.dev/api/v1/creator');
  });

  it('keeps http for local development hosts', () => {
    for (const host of ['localhost:3001', '127.0.0.1:3001', '0.0.0.0:3001']) {
      assert.equal(deriveBaseUrl(fakeRequest({ host })), `http://${host}/api/v1/creator`);
    }
  });

  it('respects an explicit http forward for a local proxy', () => {
    const req = fakeRequest({ host: 'localhost:3001', 'X-Forwarded-Proto': 'http' });
    assert.equal(deriveBaseUrl(req), 'http://localhost:3001/api/v1/creator');
  });

  it('still uses the Origin when no forwarded host is present', () => {
    const req = fakeRequest({ host: 'internal:3001', Origin: 'https://artemisa-ai.netlify.app' });
    assert.equal(deriveBaseUrl(req), 'https://artemisa-ai.netlify.app/api/v1/creator');
  });
});

describe('agent-facing documents never advertise http for a public host', () => {
  const req = fakeRequest({ host: 'artemisa-gyof3.ondigitalocean.app' });
  const baseUrl = deriveBaseUrl(req);

  it('the startup markdown links every step over https', () => {
    const doc = getStartupDocument(baseUrl);
    for (const path of ['/agent/start', '/agent/answer', '/agent/generate', '/docs']) {
      assert.ok(doc.includes(`https://artemisa-gyof3.ondigitalocean.app/api/v1/creator${path}`), `missing ${path}`);
    }
    assert.doesNotMatch(doc, /http:\/\/artemisa/);
  });

  it('the agent protocol exposes https actions and documentation_url', () => {
    const protocol = getAgentProtocol(baseUrl);
    assert.equal(protocol.baseUrl, baseUrl);
    assert.match(protocol.documentation_url, /^https:\/\//);
    const actions = protocol.instructions.steps.map((step) => step.action).filter(Boolean);
    assert.ok(actions.length > 0, 'protocol must describe steps with actions');
    for (const action of actions) {
      assert.doesNotMatch(action, /http:\/\/artemisa/);
    }
  });
});
