import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import http from 'node:http';
import { hooksRouter } from '../src/routes/hooks.js';
import { commitApprovals, clearApprovalTimers } from '../src/services/approvals.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

async function request(server, method, path, body) {
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

describe('commit-approval HITL (#418)', () => {
  after(() => {
    clearApprovalTimers();
  });

  it('creates a pending approval that persists the real diffContext', async () => {
    const app = express().use(express.json()).use('/api', hooksRouter(commitApprovals)).use(errorHandler);
    const server = http.createServer(app);
    try {
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

      const diff = 'diff --git a/src/foo.ts b/src/foo.ts\n+console.log("added line")';
      const created = await request(server, 'POST', '/api/hooks/commit-approval', { diffContext: diff });
      assert.strictEqual(created.status, 200);
      assert.strictEqual(created.body.status, 'pending');
      const { id } = created.body;

      // The approver must be able to read the actual diff before deciding (#418)
      const fetched = await request(server, 'GET', `/api/hooks/commit-approval/${id}`, undefined);
      assert.strictEqual(fetched.status, 200);
      assert.strictEqual(fetched.body.diffContext, diff);
      assert.strictEqual(fetched.body.status, 'pending');
    } finally {
      server.close();
    }
  });

  it('resolves an approval and reflects the decision on subsequent GET', async () => {
    const app = express().use(express.json()).use('/api', hooksRouter(commitApprovals)).use(errorHandler);
    const server = http.createServer(app);
    try {
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

      const created = await request(server, 'POST', '/api/hooks/commit-approval', {
        diffContext: 'diff --git a/x b/x',
      });
      const { id } = created.body;

      const resolved = await request(server, 'POST', `/api/hooks/commit-approval/${id}`, { approved: true });
      assert.strictEqual(resolved.status, 200);
      assert.strictEqual(resolved.body.status, 'approved');

      const fetched = await request(server, 'GET', `/api/hooks/commit-approval/${id}`, undefined);
      assert.strictEqual(fetched.body.status, 'approved');
      assert.strictEqual(fetched.body.diffContext, 'diff --git a/x b/x');
    } finally {
      server.close();
    }
  });

  it('returns 404 for an unknown approval id', async () => {
    const app = express().use(express.json()).use('/api', hooksRouter(commitApprovals)).use(errorHandler);
    const server = http.createServer(app);
    try {
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      const fetched = await request(server, 'GET', '/api/hooks/commit-approval/does-not-exist', undefined);
      assert.strictEqual(fetched.status, 404);
    } finally {
      server.close();
    }
  });

  it('accepts an empty diffContext without error', async () => {
    const app = express().use(express.json()).use('/api', hooksRouter(commitApprovals)).use(errorHandler);
    const server = http.createServer(app);
    try {
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      const created = await request(server, 'POST', '/api/hooks/commit-approval', {});
      assert.strictEqual(created.status, 200);
      const fetched = await request(server, 'GET', `/api/hooks/commit-approval/${created.body.id}`, undefined);
      assert.strictEqual(fetched.body.diffContext, '');
    } finally {
      server.close();
    }
  });

  it('rejects a non-string diffContext', async () => {
    const app = express().use(express.json()).use('/api', hooksRouter(commitApprovals)).use(errorHandler);
    const server = http.createServer(app);
    try {
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      const created = await request(server, 'POST', '/api/hooks/commit-approval', { diffContext: 12345 });
      assert.strictEqual(created.status, 400);
    } finally {
      server.close();
    }
  });
});
