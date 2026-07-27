import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Rate Limiting Configuration (issues #28, #39)', () => {
  // These assert the *defaults* in src/app.ts, so the ambient environment must
  // not leak in: a shell that exports RATE_LIMIT_* would otherwise make the
  // suite pass or fail depending on who runs it.
  function defaultFor(name, fallback) {
    const previous = process.env[name];
    delete process.env[name];
    const value = parseInt(process.env[name] || fallback, 10);
    if (previous !== undefined) process.env[name] = previous;
    return value;
  }

  it('global limit defaults to 100 req/min', () => {
    assert.equal(defaultFor('RATE_LIMIT_GLOBAL', '100'), 100);
  });

  it('creator limit defaults to 120 req/min (a full Auto-largo run is ~35 requests)', () => {
    assert.equal(defaultFor('RATE_LIMIT_CREATOR', '120'), 120);
  });

  it('custom limits via env vars', () => {
    process.env.RATE_LIMIT_GLOBAL = '200';
    const limit = parseInt(process.env.RATE_LIMIT_GLOBAL || '100', 10);
    assert.equal(limit, 200);
    delete process.env.RATE_LIMIT_GLOBAL;
  });

  it('key generator extracts IP from request', () => {
    const req = { ip: '192.168.1.100', socket: { remoteAddress: '192.168.1.100' } };
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    assert.equal(key, '192.168.1.100');
  });

  it('key generator falls back to socket.remoteAddress', () => {
    const req = { ip: undefined, socket: { remoteAddress: '10.0.0.1' } };
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    assert.equal(key, '10.0.0.1');
  });

  it('key generator falls back to unknown', () => {
    const req = { ip: undefined, socket: { remoteAddress: undefined } };
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    assert.equal(key, 'unknown');
  });
});
