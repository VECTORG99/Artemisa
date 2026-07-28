import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { CATALOG_VERSION } from '../src/creator/catalog.js';
import { WORKFLOW_VERSION } from '../src/creator/decisionTree.js';
import { creatorProtectedRouter, creatorPublicRouter, deriveBaseUrl } from '../src/creator/router.js';
import { developmentAnswers } from './creatorFixture.mjs';
import { withServer } from './test-utils.mjs';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/creator', creatorPublicRouter);
  app.use('/api/v1/creator', creatorProtectedRouter);
  return app;
}

function fakeRequest(headers, protocol = 'http') {
  const lower = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
  return { protocol, get: (name) => lower[name.toLowerCase()] };
}

describe('deriveBaseUrl (src/creator/router.ts)', () => {
  it('prefers the Origin header when no proxy host is present', () => {
    const req = fakeRequest({ Origin: 'https://artemisa.dev', host: 'internal:3001' });

    assert.equal(deriveBaseUrl(req), 'https://artemisa.dev/api/v1/creator');
  });

  it('keeps the request protocol for local hosts', () => {
    for (const host of ['localhost:3001', '127.0.0.1', 'LOCALHOST', '0.0.0.0:3001']) {
      assert.equal(deriveBaseUrl(fakeRequest({ host })), `http://${host}/api/v1/creator`);
    }
  });

  it('defaults remote hosts to https even when req.protocol is http (#719)', () => {
    const req = fakeRequest({ host: 'artemisa.ondigitalocean.app' });

    assert.equal(deriveBaseUrl(req), 'https://artemisa.ondigitalocean.app/api/v1/creator');
  });

  it('honours X-Forwarded-Host and the first entry of an X-Forwarded-Proto chain', () => {
    const req = fakeRequest({
      Origin: 'https://ignored.example',
      'X-Forwarded-Host': 'api.artemisa.dev',
      'X-Forwarded-Proto': 'https, http',
      host: 'internal:3001',
    });

    assert.equal(deriveBaseUrl(req), 'https://api.artemisa.dev/api/v1/creator');
  });

  it('falls back to localhost when no host header is present', () => {
    assert.equal(deriveBaseUrl(fakeRequest({})), 'http://localhost/api/v1/creator');
  });
});

describe('Creator public routes (src/creator/router.ts)', () => {
  it('advertises workflow and catalog versions on every response', async () => {
    await withServer(createApp(), async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/v1/creator/workflow`);

      assert.equal(res.status, 200);
      assert.equal(res.headers.get('x-creator-workflow-version'), WORKFLOW_VERSION);
      assert.equal(res.headers.get('x-creator-catalog-version'), CATALOG_VERSION);
    });
  });

  it('answers 304 when the client already holds the catalog ETag', async () => {
    await withServer(createApp(), async (baseUrl) => {
      const first = await fetch(`${baseUrl}/api/v1/creator/catalog`);
      const etag = first.headers.get('etag');
      const second = await fetch(`${baseUrl}/api/v1/creator/catalog`, { headers: { 'If-None-Match': etag } });

      assert.equal(first.status, 200);
      assert.ok(etag);
      assert.equal(second.status, 304);
    });
  });

  it('serves the documentation catalog and a single markdown document', async () => {
    await withServer(createApp(), async (baseUrl) => {
      const catalog = await (await fetch(`${baseUrl}/api/v1/creator/docs`)).json();
      const content = await fetch(`${baseUrl}/api/v1/creator/docs/content?path=README.md`);

      assert.equal(catalog.version, '1.0.0');
      assert.equal(catalog.count, catalog.documents.length);
      assert.ok(catalog.count > 0);
      assert.equal(content.status, 200);
      assert.match(content.headers.get('content-type'), /text\/markdown/);
      assert.match(await content.text(), /Artemisa/);
    });
  });

  it('rejects unsafe or non-markdown documentation paths as problem+json', async () => {
    await withServer(createApp(), async (baseUrl) => {
      for (const path of ['src/app.ts', '../../etc/passwd.md', '/etc/hosts.md']) {
        const res = await fetch(`${baseUrl}/api/v1/creator/docs/content?path=${encodeURIComponent(path)}`);
        const body = await res.json();

        assert.equal(res.status, 400, path);
        assert.match(res.headers.get('content-type'), /application\/problem\+json/);
        assert.equal(body.status, 400);
        assert.ok(Array.isArray(body.issues));
      }
    });
  });

  it('returns 404 problem+json for a missing documentation file', async () => {
    await withServer(createApp(), async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/v1/creator/docs/content?path=docs/does-not-exist.md`);
      const body = await res.json();

      assert.equal(res.status, 404);
      assert.match(res.headers.get('content-type'), /application\/problem\+json/);
      assert.equal(body.detail, 'docs/does-not-exist.md');
    });
  });

  it('serves the startup document as markdown or JSON depending on Accept', async () => {
    await withServer(createApp(), async (baseUrl) => {
      const markdown = await fetch(`${baseUrl}/api/v1/creator/startup`, { headers: { Accept: 'text/markdown' } });
      const json = await fetch(`${baseUrl}/api/v1/creator/startup`, { headers: { Accept: 'application/json' } });
      const jsonBody = await json.json();

      assert.match(markdown.headers.get('content-type'), /text\/markdown/);
      assert.match(markdown.headers.get('cache-control'), /max-age=300/);
      assert.equal(jsonBody.mediaType, 'text/markdown');
      assert.equal(typeof jsonBody.content, 'string');
    });
  });

  it('caches the agent protocol descriptor and derives its base URL', async () => {
    await withServer(createApp(), async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/v1/creator/agent`);
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.match(res.headers.get('cache-control'), /max-age=300/);
      assert.equal(JSON.stringify(body).includes(`${baseUrl}/api/v1/creator`), true);
    });
  });
});

describe('Creator protected routes (src/creator/router.ts)', () => {
  it('evaluates answers and omits question state in compact mode (#333)', async () => {
    await withServer(createApp(), async (baseUrl) => {
      const post = (query) =>
        fetch(`${baseUrl}/api/v1/creator/evaluate${query}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ answers: developmentAnswers }),
        });

      const full = await (await post('')).json();
      const compact = await (await post('?compact=true')).json();

      assert.ok(Array.isArray(full.visibleQuestions));
      assert.equal('visibleQuestions' in compact, false);
      assert.equal('answers' in compact, false);
      assert.equal('answeredQuestionIds' in compact, false);
    });
  });

  it('generates the same bundle from /preview and /generate', async () => {
    await withServer(createApp(), async (baseUrl) => {
      const call = (route) =>
        fetch(`${baseUrl}/api/v1/creator/${route}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ answers: developmentAnswers, workflowVersion: WORKFLOW_VERSION }),
        });

      const preview = await (await call('preview')).json();
      const generate = await (await call('generate')).json();

      assert.deepEqual(preview, generate);
    });
  });

  it('rejects non-object bodies and unknown properties with 400 problem+json', async () => {
    await withServer(createApp(), async (baseUrl) => {
      const post = (body) =>
        fetch(`${baseUrl}/api/v1/creator/evaluate`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });

      const array = await post([]);
      const unknownKey = await post({ answers: developmentAnswers, nope: true });
      const unknownBody = await unknownKey.json();

      assert.equal(array.status, 400);
      assert.match((await array.json()).title, /objeto JSON/);
      assert.equal(unknownKey.status, 400);
      assert.match(unknownBody.title, /propiedades desconocidas/);
      assert.deepEqual(unknownBody.issues, [{ path: 'body.nope', message: 'Propiedad no permitida.' }]);
    });
  });

  it('returns 409 when the client sends a stale workflow or catalog version', async () => {
    await withServer(createApp(), async (baseUrl) => {
      const post = (body) =>
        fetch(`${baseUrl}/api/v1/creator/preview`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });

      const staleWorkflow = await post({ answers: developmentAnswers, workflowVersion: '0.0.0-old' });
      const staleCatalog = await post({ answers: developmentAnswers, catalogVersion: '0.0.0-old' });

      assert.equal(staleWorkflow.status, 409);
      assert.match((await staleWorkflow.json()).title, /workflow cambió/);
      assert.equal(staleCatalog.status, 409);
      assert.match((await staleCatalog.json()).title, /catálogo cambió/);
    });
  });
});
