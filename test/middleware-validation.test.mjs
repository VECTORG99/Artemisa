import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { enforceJsonContentType, validatePathParams } from '../src/middleware/validation.js';

/** Minimal Express-like response double capturing status and JSON payload. */
function createResponse() {
  return {
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
}

function run(middleware, req) {
  const res = createResponse();
  let nextCalls = 0;
  middleware(req, res, () => {
    nextCalls++;
  });
  return { res, nextCalls };
}

describe('validatePathParams (src/middleware/validation.ts)', () => {
  it('passes safe params through', () => {
    const { res, nextCalls } = run(validatePathParams, { params: { id: 'req_abc-1.2:3', name: 'Agent_01' } });

    assert.equal(nextCalls, 1);
    assert.equal(res.statusCode, undefined);
  });

  it('passes when there are no params at all', () => {
    const { nextCalls } = run(validatePathParams, {});

    assert.equal(nextCalls, 1);
  });

  it('rejects params longer than 100 characters', () => {
    const { res, nextCalls } = run(validatePathParams, { params: { id: 'a'.repeat(101) } });

    assert.equal(nextCalls, 0);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.error, /Path parameter "id" exceeds maximum length \(100\)/);
  });

  it('accepts a param of exactly 100 characters', () => {
    const { res, nextCalls } = run(validatePathParams, { params: { id: 'a'.repeat(100) } });

    assert.equal(nextCalls, 1);
    assert.equal(res.statusCode, undefined);
  });

  for (const value of ['../etc/passwd', 'a/b', 'drop table', '<script>', 'ñame', 'id;rm']) {
    it(`rejects invalid characters in "${value}"`, () => {
      const { res, nextCalls } = run(validatePathParams, { params: { id: value } });

      assert.equal(nextCalls, 0);
      assert.equal(res.statusCode, 400);
      assert.match(res.body.error, /Path parameter "id" contains invalid characters/);
    });
  }

  it('ignores non-string param values', () => {
    const { res, nextCalls } = run(validatePathParams, { params: { id: 42, nested: { a: 1 } } });

    assert.equal(nextCalls, 1);
    assert.equal(res.statusCode, undefined);
  });

  it('reports the first offending param key', () => {
    const { res } = run(validatePathParams, { params: { good: 'ok', bad: 'a b' } });

    assert.match(res.body.error, /"bad"/);
  });
});

describe('enforceJsonContentType (src/middleware/validation.ts)', () => {
  for (const method of ['GET', 'HEAD', 'DELETE', 'OPTIONS']) {
    it(`does not require a Content-Type for ${method}`, () => {
      const { res, nextCalls } = run(enforceJsonContentType, { method, headers: {} });

      assert.equal(nextCalls, 1);
      assert.equal(res.statusCode, undefined);
    });
  }

  for (const method of ['POST', 'PUT', 'PATCH']) {
    it(`rejects ${method} without a Content-Type`, () => {
      const { res, nextCalls } = run(enforceJsonContentType, { method, headers: {} });

      assert.equal(nextCalls, 0);
      assert.equal(res.statusCode, 415);
      assert.equal(res.body.error, 'Content-Type must be application/json');
    });
  }

  for (const contentType of [
    'application/json',
    'application/json; charset=utf-8',
    'APPLICATION/JSON',
    ' application/json ',
  ]) {
    it(`accepts POST with Content-Type "${contentType}"`, () => {
      const { res, nextCalls } = run(enforceJsonContentType, {
        method: 'POST',
        headers: { 'content-type': contentType },
      });

      assert.equal(nextCalls, 1);
      assert.equal(res.statusCode, undefined);
    });
  }

  for (const contentType of ['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data; boundary=x']) {
    it(`rejects POST with Content-Type "${contentType}"`, () => {
      const { res, nextCalls } = run(enforceJsonContentType, {
        method: 'POST',
        headers: { 'content-type': contentType },
      });

      assert.equal(nextCalls, 0);
      assert.equal(res.statusCode, 415);
    });
  }
});
