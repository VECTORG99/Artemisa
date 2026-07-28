import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

/** `src/config.ts` snapshots the environment at import time. */
async function loadConfig(env) {
  const keys = ['PORT', 'HOST', 'REQUEST_TIMEOUT_MS'];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) {
    const value = env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    const { config } = await import(`../src/config.js?case=${crypto.randomUUID()}`);
    return config;
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

describe('config (src/config.ts)', () => {
  it('applies defaults when server env vars are unset', async () => {
    const config = await loadConfig({});

    assert.deepEqual(config.server, { port: 3001, host: '0.0.0.0', requestTimeoutMs: 120000 });
  });

  it('reads integer env vars', async () => {
    const config = await loadConfig({ PORT: '8080', HOST: '127.0.0.1', REQUEST_TIMEOUT_MS: '5000' });

    assert.deepEqual(config.server, { port: 8080, host: '127.0.0.1', requestTimeoutMs: 5000 });
  });

  it('falls back when an integer env var is not a usable number', async () => {
    for (const port of ['not-a-number', '-1', '']) {
      assert.equal((await loadConfig({ PORT: port })).server.port, 3001);
    }
  });

  it('accepts zero as an explicit port', async () => {
    assert.equal((await loadConfig({ PORT: '0' })).server.port, 0);
  });

  it('exposes only server settings (#584)', async () => {
    assert.deepEqual(Object.keys(await loadConfig({})), ['server']);
  });
});
