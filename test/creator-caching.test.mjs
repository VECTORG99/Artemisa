import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import { creatorPublicRouter } from '../src/creator/router.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { getCreatorCatalog } from '../src/creator/catalog.js';
import { getWorkflowDefinition } from '../src/creator/decisionTree.js';
import { getSkillsCatalog } from '../src/creator/skillsCatalog.js';
import { getMcpCatalog } from '../src/creator/mcpCatalog.js';

async function get(server, path, headers = {}) {
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}${path}`, { headers });
  const body = await res.text();
  return { status: res.status, headers: res.headers, body };
}

function startServer() {
  const app = express().use(express.json()).use('/api/v1/creator', creatorPublicRouter).use(errorHandler);
  return http.createServer(app);
}

describe('Creator response caching (#404/#405/#407)', () => {
  it('serves the no-filter catalog from a frozen memoized instance', () => {
    const a = getCreatorCatalog();
    const b = getCreatorCatalog();
    assert.strictEqual(a, b, 'no-filter calls must return the same frozen instance');
    assert.ok(Object.isFrozen(a), 'memoized catalog response should be frozen');
  });

  it('serves the workflow definition from a frozen memoized instance', () => {
    const a = getWorkflowDefinition();
    const b = getWorkflowDefinition();
    assert.strictEqual(a, b, 'workflow calls must return the same frozen instance');
    assert.ok(Object.isFrozen(a));
  });

  it('serves the no-filter skills and mcp catalogs from frozen memoized instances', () => {
    assert.strictEqual(getSkillsCatalog(), getSkillsCatalog());
    assert.ok(Object.isFrozen(getSkillsCatalog()));
    assert.strictEqual(getMcpCatalog(), getMcpCatalog());
    assert.ok(Object.isFrozen(getMcpCatalog()));
  });

  it('sets ETag and returns 304 on If-None-Match match for /catalog', async () => {
    const server = startServer();
    try {
      await new Promise((r) => server.listen(0, '127.0.0.1', r));
      const first = await get(server, '/api/v1/creator/catalog');
      assert.equal(first.status, 200);
      const etag = first.headers.get('etag');
      assert.ok(etag, 'ETag header should be set');
      assert.ok(first.headers.get('cache-control')?.includes('stale-while-revalidate'));

      const second = await get(server, '/api/v1/creator/catalog', { 'If-None-Match': etag });
      assert.equal(second.status, 304);
      assert.equal(second.body, '');
    } finally {
      await new Promise((r) => server.close(r));
    }
  });

  it('returns 304 for /workflow, /tutorial, /skills, /mcps with matching ETag', async () => {
    const server = startServer();
    try {
      await new Promise((r) => server.listen(0, '127.0.0.1', r));
      for (const path of ['/workflow', '/tutorial', '/skills', '/mcps']) {
        const first = await get(server, `/api/v1/creator${path}`);
        assert.equal(first.status, 200, `${path} first GET`);
        const etag = first.headers.get('etag');
        assert.ok(etag, `${path} should set ETag`);
        const second = await get(server, `/api/v1/creator${path}`, { 'If-None-Match': etag });
        assert.equal(second.status, 304, `${path} should return 304 on matching ETag`);
      }
    } finally {
      await new Promise((r) => server.close(r));
    }
  });

  it('still serves full content when If-None-Match does not match', async () => {
    const server = startServer();
    try {
      await new Promise((r) => server.listen(0, '127.0.0.1', r));
      const res = await get(server, '/api/v1/creator/catalog', { 'If-None-Match': '"stale-etag"' });
      assert.equal(res.status, 200);
      const parsed = JSON.parse(res.body);
      assert.ok(Array.isArray(parsed.items));
    } finally {
      await new Promise((r) => server.close(r));
    }
  });
});
