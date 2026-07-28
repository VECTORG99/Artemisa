import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import fs from 'node:fs';
import http from 'node:http';
import { ApiError, ErrorCodes } from '../src/errors.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { creatorPublicRouter } from '../src/creator/router.js';

function startServer(configure) {
  const app = express().use(express.json());
  configure(app);
  app.use(errorHandler);
  const server = http.createServer(app);
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function call(server, path, options = {}) {
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}${path}`, options);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  return { status: res.status, body: text, json };
}

const originalNodeEnv = process.env.NODE_ENV;

after(() => {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
});

describe('error propagation', () => {
  it('answers unexpected route failures with 500 and a generic message in production', async () => {
    const server = await startServer((app) => {
      app.get('/boom', () => {
        throw new Error('connection string postgres://user:pw@internal');
      });
    });
    process.env.NODE_ENV = 'production';
    try {
      const res = await call(server, '/boom');
      assert.equal(res.status, 500);
      assert.equal(res.json.error.code, ErrorCodes.INTERNAL_ERROR);
      assert.equal(res.json.error.message, 'Internal server error');
      assert.ok(!res.body.includes('postgres://'), 'internal details must not reach the client');
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      server.close();
    }
  });

  it('keeps operational error messages in production', async () => {
    const server = await startServer((app) => {
      app.get('/forbidden', (_req, _res, next) => {
        next(new ApiError(ErrorCodes.API_VALIDATION_ERROR, 'Origin https://evil.test not allowed by CORS', 403));
      });
    });
    process.env.NODE_ENV = 'production';
    try {
      const res = await call(server, '/forbidden');
      assert.equal(res.status, 403);
      assert.equal(res.json.error.code, ErrorCodes.API_VALIDATION_ERROR);
      assert.match(res.json.error.message, /not allowed by CORS/);
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      server.close();
    }
  });

  it('exposes unexpected error messages outside production for debugging', async () => {
    const server = await startServer((app) => {
      app.get('/boom', () => {
        throw new Error('tree node missing');
      });
    });
    process.env.NODE_ENV = 'test';
    try {
      const res = await call(server, '/boom');
      assert.equal(res.status, 500);
      assert.equal(res.json.error.message, 'tree node missing');
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      server.close();
    }
  });

  it('does not overwrite a response that was already sent', async () => {
    const server = await startServer((app) => {
      app.get('/late', (_req, res, next) => {
        res.status(200).json({ ok: true });
        next(new Error('failed after headers were sent'));
      });
    });
    try {
      const res = await call(server, '/late');
      assert.equal(res.status, 200);
      assert.deepEqual(res.json, { ok: true });
    } finally {
      server.close();
    }
  });
});

describe('POST /agent/answer error handling', () => {
  it('reports invalid answers as 400 issues', async () => {
    const server = await startServer((app) => app.use('/api/v1/creator', creatorPublicRouter));
    try {
      const res = await call(server, '/api/v1/creator/agent/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: 'not-an-object' }),
      });
      assert.equal(res.status, 400);
      assert.ok(res.json.issues.length > 0);
    } finally {
      server.close();
    }
  });

  it('advances the flow for valid answers', async () => {
    const server = await startServer((app) => app.use('/api/v1/creator', creatorPublicRouter));
    try {
      const res = await call(server, '/api/v1/creator/agent/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: { agent_name: 'Test' } }),
      });
      assert.equal(res.status, 200);
      assert.ok(res.json.next_question);
      assert.deepEqual(res.json.issues, []);
    } finally {
      server.close();
    }
  });

  it('never downgrades unexpected failures to client-side issues', () => {
    const src = fs.readFileSync('src/creator/agentProtocol.ts', 'utf8');
    assert.match(src, /if \(!\(error instanceof CreatorInputError\)\) throw error;/);
  });
});
