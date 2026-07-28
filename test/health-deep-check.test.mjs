import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import { deepHealthCheck } from '../src/health.js';

describe('deepHealthCheck (src/health.ts)', () => {
  it('reports process-level checks only', () => {
    const health = deepHealthCheck();

    assert.deepEqual(Object.keys(health).sort(), ['checks', 'status', 'timestamp', 'uptime', 'version']);
    assert.deepEqual(Object.keys(health.checks).sort(), ['disk', 'memory']);
    assert.equal(health.checks.disk.status, 'ok');
  });

  it('returns healthy while memory stays under the 90% limit', () => {
    const health = deepHealthCheck();

    assert.equal(health.status, 'healthy');
    assert.equal(health.checks.memory.status, 'ok');
    assert.ok(health.checks.memory.percent <= 90);
  });

  it('measures memory against the container or host limit, not the V8 heap', () => {
    const { memory } = deepHealthCheck().checks;
    const hostTotalMb = Math.floor(os.totalmem() / 1024 / 1024);

    assert.ok(memory.limit_mb > 0);
    assert.ok(memory.limit_mb <= hostTotalMb);
    assert.ok(memory.used_mb > 0);
    assert.ok(memory.used_mb < memory.limit_mb);
    assert.equal(memory.percent, Math.min(100, Math.round((memory.used_mb / memory.limit_mb) * 100)));
  });

  it('reports a non-negative uptime and an ISO timestamp', () => {
    const health = deepHealthCheck();

    assert.ok(Number.isInteger(health.uptime));
    assert.ok(health.uptime >= 0);
    assert.equal(new Date(health.timestamp).toISOString(), health.timestamp);
  });

  it('falls back to 0.0.0 when npm_package_version is absent', () => {
    const previous = process.env.npm_package_version;
    delete process.env.npm_package_version;
    try {
      assert.equal(deepHealthCheck().version, '0.0.0');
    } finally {
      if (previous === undefined) delete process.env.npm_package_version;
      else process.env.npm_package_version = previous;
    }
  });

  it('reports the package version when npm_package_version is set', () => {
    const previous = process.env.npm_package_version;
    process.env.npm_package_version = '9.9.9';
    try {
      assert.equal(deepHealthCheck().version, '9.9.9');
    } finally {
      if (previous === undefined) delete process.env.npm_package_version;
      else process.env.npm_package_version = previous;
    }
  });
});
