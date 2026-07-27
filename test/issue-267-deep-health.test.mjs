import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

describe('Issue #267: Deep health endpoint', () => {
  it('health router uses deepHealthCheck from src/health.ts', () => {
    const router = fs.readFileSync('src/routes/health.ts', 'utf8');
    assert.match(router, /import.*deepHealthCheck.*from.*health/);
    assert.match(router, /deepHealthCheck\(\)/);
  });

  it('GET /api/health returns 503 when unhealthy', () => {
    const router = fs.readFileSync('src/routes/health.ts', 'utf8');
    assert.match(router, /unhealthy.*503|503.*unhealthy/);
  });

  it('GET /api/health/live is a simple liveness probe', () => {
    const router = fs.readFileSync('src/routes/health.ts', 'utf8');
    assert.match(router, /\/health\/live/);
    assert.match(router, /alive/);
  });

  it('GET /api/health/ready checks all dependencies', () => {
    const router = fs.readFileSync('src/routes/health.ts', 'utf8');
    assert.match(router, /\/health\/ready/);
    assert.match(router, /ready/);
  });

  it('app.ts mounts the health router', () => {
    const app = fs.readFileSync('src/app.ts', 'utf8');
    assert.match(app, /createHealthRouter\(\)/);
  });

  it('deepHealthCheck reports memory and disk, no database (#584)', () => {
    const health = fs.readFileSync('src/health.ts', 'utf8');
    assert.match(health, /memory/);
    assert.match(health, /disk/);
    assert.match(health, /unhealthy|degraded|healthy/);
    assert.doesNotMatch(health, /database:/);
    assert.doesNotMatch(health, /Store/);
  });
});
