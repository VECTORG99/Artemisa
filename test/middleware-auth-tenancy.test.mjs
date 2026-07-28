import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

/**
 * `src/middleware/auth.ts` reads AUTH_REQUIRED and ARTEMISA_API_KEYS at import
 * time, so each scenario imports a fresh module instance.
 */
async function loadAuth({ authRequired, apiKeys }) {
  const previous = { AUTH_REQUIRED: process.env.AUTH_REQUIRED, ARTEMISA_API_KEYS: process.env.ARTEMISA_API_KEYS };
  if (authRequired === undefined) delete process.env.AUTH_REQUIRED;
  else process.env.AUTH_REQUIRED = authRequired;
  if (apiKeys === undefined) delete process.env.ARTEMISA_API_KEYS;
  else process.env.ARTEMISA_API_KEYS = apiKeys;
  try {
    return await import(`../src/middleware/auth.js?case=${crypto.randomUUID()}`);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function callRequireAuth(requireAuth, headers) {
  const req = { headers };
  const res = {
    statusCode: undefined,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  let nextCalls = 0;
  requireAuth(req, res, () => {
    nextCalls++;
  });
  return { req, res, nextCalls };
}

describe('requireAuth without auth enforcement (src/middleware/auth.ts)', () => {
  it('passes through with the dev tenant', async () => {
    const { requireAuth, getTenantId } = await loadAuth({ authRequired: 'false' });

    const { req, res, nextCalls } = callRequireAuth(requireAuth, {});

    assert.equal(nextCalls, 1);
    assert.equal(res.statusCode, undefined);
    assert.equal(getTenantId(req), 'dev');
  });
});

describe('requireAuth with configured API keys (src/middleware/auth.ts)', () => {
  it('accepts a Bearer token and assigns a stable tenant id', async () => {
    const { requireAuth, getTenantId } = await loadAuth({ authRequired: 'true', apiKeys: 'key-one, key-two' });
    const expectedTenant = crypto.createHash('sha256').update('key-two').digest('hex').slice(0, 8);

    const first = callRequireAuth(requireAuth, { authorization: 'Bearer key-two' });
    const second = callRequireAuth(requireAuth, { authorization: 'Bearer  key-two ' });

    assert.equal(first.nextCalls, 1);
    assert.equal(getTenantId(first.req), expectedTenant);
    assert.equal(getTenantId(second.req), expectedTenant);
    assert.notEqual(getTenantId(first.req), 'key-two');
  });

  it('accepts the X-API-Key header and isolates tenants per key', async () => {
    const { requireAuth, getTenantId } = await loadAuth({ authRequired: 'true', apiKeys: 'key-one,key-two' });

    const one = callRequireAuth(requireAuth, { 'x-api-key': 'key-one' });
    const two = callRequireAuth(requireAuth, { 'x-api-key': 'key-two' });

    assert.equal(one.nextCalls, 1);
    assert.equal(two.nextCalls, 1);
    assert.notEqual(getTenantId(one.req), getTenantId(two.req));
  });

  it('answers 401 AUTH_MISSING when no credential is provided', async () => {
    const { requireAuth } = await loadAuth({ authRequired: 'true', apiKeys: 'key-one' });

    for (const headers of [{}, { authorization: 'Basic key-one' }, { 'x-api-key': '' }]) {
      const { res, nextCalls } = callRequireAuth(requireAuth, headers);

      assert.equal(nextCalls, 0);
      assert.equal(res.statusCode, 401);
      assert.equal(res.body.code, 'AUTH_MISSING');
    }
  });

  it('answers 403 AUTH_INVALID for an unknown key', async () => {
    const { requireAuth, getTenantId } = await loadAuth({ authRequired: 'true', apiKeys: 'key-one' });

    const { req, res, nextCalls } = callRequireAuth(requireAuth, { 'x-api-key': 'key-onE' });

    assert.equal(nextCalls, 0);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.code, 'AUTH_INVALID');
    assert.equal(getTenantId(req), 'anonymous');
  });

  it('ignores blank entries when parsing ARTEMISA_API_KEYS', async () => {
    const { requireAuth } = await loadAuth({ authRequired: 'true', apiKeys: ' key-one , , ' });

    assert.equal(callRequireAuth(requireAuth, { 'x-api-key': 'key-one' }).nextCalls, 1);
    assert.equal(callRequireAuth(requireAuth, { 'x-api-key': '' }).res.statusCode, 401);
  });

  it('enforces auth by default when AUTH_REQUIRED is unset', async () => {
    const { requireAuth } = await loadAuth({ authRequired: undefined, apiKeys: 'key-one' });

    assert.equal(callRequireAuth(requireAuth, {}).res.statusCode, 401);
  });
});
