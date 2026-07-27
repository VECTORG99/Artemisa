import { describe, it } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

const REMOVED_RUNTIME_PATHS = [
  '/api/agent/execute',
  '/api/agent/execute/stream',
  '/api/agents',
  '/api/agents/{id}',
  '/api/agents/{id}/execute',
  '/api/hooks/commit-approval',
  '/api/hooks/commit-approval/{id}',
  '/api/rag/sources',
  '/api/history',
  '/api/roles',
];

describe('openapi endpoint', () => {
  it('returns OpenAPI 3.1 spec with Creator paths', async () => {
    const { app } = await import(`../src/app.js?case=${Date.now()}`);
    const server = http.createServer(app);

    try {
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      const { port } = server.address();
      const res = await fetch(`http://127.0.0.1:${port}/api/openapi.json`);
      const body = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.openapi, '3.1.0');
      assert.ok(body.paths['/api/health']);
      assert.ok(body.paths['/api/metrics']);
      assert.ok(body.paths['/api/v1/creator/catalog']);
      assert.ok(body.paths['/api/v1/creator/workflow']);
      assert.ok(body.paths['/api/v1/creator/preview']);

      // Runtime endpoints were removed with the runtime itself (#584)
      for (const removed of REMOVED_RUNTIME_PATHS) {
        assert.strictEqual(body.paths[removed], undefined, `${removed} must not be documented`);
      }
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
