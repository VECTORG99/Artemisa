import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createHealthRouter } from '../src/routes/health.js';
import { withServer } from './test-utils.mjs';

function createApp() {
  return express().use('/api', createHealthRouter());
}

describe('createHealthRouter (src/routes/health.ts)', () => {
  it('GET /api/health returns the deep check payload with 200 while healthy', async () => {
    await withServer(createApp(), async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/health`);
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.status, 'healthy');
      assert.equal(body.checks.memory.status, 'ok');
      assert.equal(body.checks.disk.status, 'ok');
    });
  });

  it('GET /api/health/live is a bare liveness probe', async () => {
    await withServer(createApp(), async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/health/live`);
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.deepEqual(Object.keys(body).sort(), ['status', 'timestamp']);
      assert.equal(body.status, 'alive');
      assert.equal(new Date(body.timestamp).toISOString(), body.timestamp);
    });
  });

  it('GET /api/health/ready adds the ready flag to the deep check', async () => {
    await withServer(createApp(), async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/health/ready`);
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.ready, true);
      assert.equal(body.status, 'healthy');
      assert.ok('checks' in body);
    });
  });
});
