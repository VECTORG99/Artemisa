import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createMetricsState, metricsMiddleware, metricsRouter } from '../src/routes/metrics.js';
import { withServer } from './test-utils.mjs';

/**
 * Error counters are updated on the response 'finish' event, which can land
 * just after fetch() resolves on the client side.
 */
async function waitForErrors(state, path, count) {
  for (let i = 0; i < 200 && (state.metrics.errorsByPath.get(path) || 0) < count; i++) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.equal(state.metrics.errorsByPath.get(path), count);
}

function createApp(state) {
  const app = express();
  app.use(metricsMiddleware(state));
  app.get('/ok', (_req, res) => res.json({ ok: true }));
  app.get('/boom', (_req, res) => res.status(500).json({ error: 'boom' }));
  app.use('/api', metricsRouter(state));
  return app;
}

async function withMetricsEnv(env, fn) {
  const previous = { METRICS_SECRET: process.env.METRICS_SECRET, NODE_ENV: process.env.NODE_ENV };
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    await fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

describe('createMetricsState (src/routes/metrics.ts)', () => {
  it('starts empty with a start timestamp', () => {
    const state = createMetricsState();

    assert.equal(state.metrics.totalRequests, 0);
    assert.equal(state.metrics.requestsByPath.size, 0);
    assert.equal(state.metrics.errorsByPath.size, 0);
    assert.ok(state.startTime <= Date.now());
  });
});

describe('metricsMiddleware (src/routes/metrics.ts)', () => {
  it('counts requests per path and errors only for status >= 400', async () => {
    const state = createMetricsState();

    await withMetricsEnv({ METRICS_SECRET: undefined, NODE_ENV: 'test' }, async () => {
      await withServer(createApp(state), async (baseUrl) => {
        await fetch(`${baseUrl}/ok`);
        await fetch(`${baseUrl}/ok`);
        await fetch(`${baseUrl}/boom`);
        await waitForErrors(state, '/boom', 1);
      });
    });

    assert.equal(state.metrics.totalRequests, 3);
    assert.equal(state.metrics.requestsByPath.get('/ok'), 2);
    assert.equal(state.metrics.requestsByPath.get('/boom'), 1);
    assert.equal(state.metrics.errorsByPath.get('/ok'), undefined);
    assert.equal(state.metrics.errorsByPath.get('/boom'), 1);
  });

  it('bounds tracked paths to 200 entries', async () => {
    const state = createMetricsState();

    await withMetricsEnv({ METRICS_SECRET: undefined, NODE_ENV: 'test' }, async () => {
      const app = express();
      app.use(metricsMiddleware(state));
      app.get('/p/:id', (_req, res) => res.json({ ok: true }));
      await withServer(app, async (baseUrl) => {
        for (let i = 0; i < 205; i++) {
          await fetch(`${baseUrl}/p/${i}`);
        }
      });
    });

    assert.equal(state.metrics.totalRequests, 205);
    assert.equal(state.metrics.requestsByPath.size, 200);
  });
});

describe('GET /metrics (src/routes/metrics.ts)', () => {
  it('serves aggregated metrics without a secret outside production', async () => {
    const state = createMetricsState();

    await withMetricsEnv({ METRICS_SECRET: undefined, NODE_ENV: 'development' }, async () => {
      await withServer(createApp(state), async (baseUrl) => {
        await fetch(`${baseUrl}/ok`);
        await fetch(`${baseUrl}/boom`);
        await waitForErrors(state, '/boom', 1);
        const res = await fetch(`${baseUrl}/api/metrics`);
        const body = await res.json();

        assert.equal(res.status, 200);
        assert.deepEqual(Object.keys(body).sort(), ['topPaths', 'totalErrors', 'totalRequests', 'uptime']);
        assert.equal(body.totalErrors, 1);
        assert.ok(body.totalRequests >= 2);
        assert.ok(body.topPaths.length <= 10);
        assert.ok(body.topPaths.every((entry) => typeof entry.path === 'string' && typeof entry.count === 'number'));
      });
    });
  });

  it('returns 403 in production when METRICS_SECRET is not configured', async () => {
    await withMetricsEnv({ METRICS_SECRET: undefined, NODE_ENV: 'Production' }, async () => {
      await withServer(createApp(createMetricsState()), async (baseUrl) => {
        const res = await fetch(`${baseUrl}/api/metrics`);

        assert.equal(res.status, 403);
        assert.match((await res.json()).error, /METRICS_SECRET not configured/);
      });
    });
  });

  it('accepts the secret via header or query token', async () => {
    await withMetricsEnv({ METRICS_SECRET: 'super-secret', NODE_ENV: 'production' }, async () => {
      await withServer(createApp(createMetricsState()), async (baseUrl) => {
        const headerRes = await fetch(`${baseUrl}/api/metrics`, { headers: { 'x-metrics-token': 'super-secret' } });
        const queryRes = await fetch(`${baseUrl}/api/metrics?token=super-secret`);

        assert.equal(headerRes.status, 200);
        assert.equal(queryRes.status, 200);
      });
    });
  });

  it('rejects a missing, wrong or wrong-length token with 401', async () => {
    await withMetricsEnv({ METRICS_SECRET: 'super-secret', NODE_ENV: 'development' }, async () => {
      await withServer(createApp(createMetricsState()), async (baseUrl) => {
        const missing = await fetch(`${baseUrl}/api/metrics`);
        const wrong = await fetch(`${baseUrl}/api/metrics`, { headers: { 'x-metrics-token': 'super-secreT' } });
        const shorter = await fetch(`${baseUrl}/api/metrics?token=super`);

        assert.equal(missing.status, 401);
        assert.equal(wrong.status, 401);
        assert.equal(shorter.status, 401);
        assert.deepEqual(await missing.json(), { error: 'Unauthorized' });
      });
    });
  });
});
