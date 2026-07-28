import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createDebugState, debugMiddleware, debugRouter } from '../src/routes/debug.js';
import { withServer } from './test-utils.mjs';

/**
 * Debug entries are written on the response 'finish' event, which can land just
 * after fetch() resolves on the client side.
 */
async function waitForRequests(state, count) {
  for (let i = 0; i < 200 && state.requests.length < count; i++) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.equal(state.requests.length, count);
}

function createApp(state) {
  const app = express();
  app.use(express.json());
  app.use(debugMiddleware(state));
  app.post('/echo', (req, res) => res.json(req.body));
  app.get('/ok', (_req, res) => res.json({ ok: true }));
  app.use('/api', debugRouter(state));
  return app;
}

async function withNodeEnv(value, fn) {
  const previous = process.env.NODE_ENV;
  if (value === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = value;
  try {
    await fn();
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
}

describe('createDebugState (src/routes/debug.ts)', () => {
  it('is enabled outside production', async () => {
    await withNodeEnv('development', async () => {
      assert.equal(createDebugState().enabled, true);
    });
  });

  for (const nodeEnv of ['production', 'Production', 'PRODUCTION']) {
    it(`is disabled when NODE_ENV is "${nodeEnv}"`, async () => {
      await withNodeEnv(nodeEnv, async () => {
        assert.equal(createDebugState().enabled, false);
      });
    });
  }
});

describe('debugMiddleware (src/routes/debug.ts)', () => {
  it('records method, path, status and redacted body newest-first', async () => {
    await withNodeEnv('development', async () => {
      const state = createDebugState();
      await withServer(createApp(state), async (baseUrl) => {
        await fetch(`${baseUrl}/ok`);
        await fetch(`${baseUrl}/echo`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: 'agent', Password: 'hunter2', system_prompt: 'secret' }),
        });
        await waitForRequests(state, 2);
      });

      const [newest, oldest] = state.requests;
      assert.equal(newest.method, 'POST');
      assert.equal(newest.path, '/echo');
      assert.equal(newest.statusCode, 200);
      assert.deepEqual(newest.body, { name: 'agent', Password: '[REDACTED]', system_prompt: '[REDACTED]' });
      assert.ok(newest.durationMs >= 0);
      assert.equal(oldest.path, '/ok');
      assert.equal(oldest.body, undefined);
    });
  });

  it('truncates long string values in captured bodies', async () => {
    await withNodeEnv('development', async () => {
      const state = createDebugState();
      await withServer(createApp(state), async (baseUrl) => {
        await fetch(`${baseUrl}/echo`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ notes: 'x'.repeat(1500) }),
        });
        await waitForRequests(state, 1);
      });

      assert.equal(state.requests[0].body.notes, 'x'.repeat(1024) + '...[truncated]');
    });
  });

  it('records nothing when debug is disabled', async () => {
    await withNodeEnv('development', async () => {
      const state = createDebugState();
      state.enabled = false;
      await withServer(createApp(state), async (baseUrl) => {
        const res = await fetch(`${baseUrl}/ok`);
        assert.equal(res.status, 200);
      });

      assert.equal(state.requests.length, 0);
    });
  });
});

describe('debugRouter (src/routes/debug.ts)', () => {
  it('lists captured requests with a limit capped at 50', async () => {
    await withNodeEnv('development', async () => {
      const state = createDebugState();
      state.requests = Array.from({ length: 60 }, (_v, i) => ({
        id: `req_${i}`,
        method: 'GET',
        path: `/p/${i}`,
        body: undefined,
        timestamp: Date.now(),
        durationMs: 1,
        statusCode: 200,
      }));

      await withServer(createApp(state), async (baseUrl) => {
        const defaultLimit = await (await fetch(`${baseUrl}/api/debug/requests`)).json();
        const capped = await (await fetch(`${baseUrl}/api/debug/requests?limit=999`)).json();
        const explicit = await (await fetch(`${baseUrl}/api/debug/requests?limit=3`)).json();

        assert.equal(defaultLimit.requests.length, 20);
        assert.equal(defaultLimit.requests[0].id, 'req_0');
        assert.equal(defaultLimit.total, 60);
        // Capture is capped at MAX_DEBUG_REQUESTS, so the cap wins over limit=999.
        assert.equal(capped.requests.length, 50);
        assert.equal(explicit.requests.length, 3);
      });
    });
  });

  it('returns a single captured request by id and 404 for unknown ids', async () => {
    await withNodeEnv('development', async () => {
      const state = createDebugState();
      await withServer(createApp(state), async (baseUrl) => {
        await fetch(`${baseUrl}/ok`);
        await waitForRequests(state, 1);
        const { id } = state.requests[0];

        const found = await fetch(`${baseUrl}/api/debug/requests/${id}`);
        const missing = await fetch(`${baseUrl}/api/debug/requests/req_missing`);

        assert.equal(found.status, 200);
        assert.equal((await found.json()).id, id);
        assert.equal(missing.status, 404);
        assert.deepEqual(await missing.json(), { error: 'Request not found' });
      });
    });
  });

  it('exposes limited stats without version fingerprinting', async () => {
    await withNodeEnv('development', async () => {
      await withServer(createApp(createDebugState()), async (baseUrl) => {
        const stats = await (await fetch(`${baseUrl}/api/debug/stats`)).json();

        assert.deepEqual(Object.keys(stats).sort(), ['debugRequestsCaptured', 'maxRequests', 'ttlMs', 'uptime']);
        assert.equal(stats.maxRequests, 50);
        assert.equal(stats.ttlMs, 10 * 60 * 1000);
      });
    });
  });

  it('answers 404 on every debug route in production', async () => {
    const state = createDebugState();
    await withNodeEnv('production', async () => {
      await withServer(createApp(state), async (baseUrl) => {
        for (const route of ['/api/debug/requests', '/api/debug/requests/req_1', '/api/debug/stats']) {
          const res = await fetch(`${baseUrl}${route}`);
          assert.equal(res.status, 404, route);
          assert.deepEqual(await res.json(), { error: 'Not found' });
        }
      });
    });
  });
});
