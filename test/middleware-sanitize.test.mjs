import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeRequestBody, stripDangerousKeys } from '../src/middleware/sanitize.js';

function runMiddleware(req) {
  let nextCalls = 0;
  sanitizeRequestBody(req, {}, () => {
    nextCalls++;
  });
  return nextCalls;
}

describe('stripDangerousKeys (src/middleware/sanitize.ts)', () => {
  it('returns primitives and null untouched', () => {
    assert.equal(stripDangerousKeys(null), null);
    assert.equal(stripDangerousKeys(undefined), undefined);
    assert.equal(stripDangerousKeys('__proto__'), '__proto__');
    assert.equal(stripDangerousKeys(7), 7);
  });

  it('removes prototype pollution keys at the top level', () => {
    const body = JSON.parse('{"name":"agent","__proto__":{"admin":true},"constructor":1,"prototype":2}');

    stripDangerousKeys(body);

    assert.deepEqual(Object.keys(body), ['name']);
  });

  it('removes dangerous keys from nested objects', () => {
    const body = JSON.parse('{"answers":{"deep":{"__proto__":{"admin":true},"keep":"yes"}}}');

    stripDangerousKeys(body);

    assert.deepEqual(body, { answers: { deep: { keep: 'yes' } } });
  });

  it('removes dangerous keys from objects inside arrays', () => {
    const body = JSON.parse('{"items":[{"__proto__":{"x":1},"id":"a"},{"constructor":1,"id":"b"}]}');

    stripDangerousKeys(body);

    assert.deepEqual(body, { items: [{ id: 'a' }, { id: 'b' }] });
  });

  it('does not pollute Object.prototype', () => {
    stripDangerousKeys(JSON.parse('{"__proto__":{"polluted":"yes"}}'));

    assert.equal({}.polluted, undefined);
  });

  it('mutates in place and returns the same reference', () => {
    const body = { keep: 1 };

    assert.equal(stripDangerousKeys(body), body);
  });

  it('stops recursing past depth 20', () => {
    let root = JSON.parse('{"__proto__":{"admin":true}}');
    for (let i = 0; i < 25; i++) {
      root = { level: root };
    }

    stripDangerousKeys(root);

    // The deepest node is beyond the depth guard, so its dangerous key survives.
    let node = root;
    while (node.level) node = node.level;
    assert.deepEqual(Object.keys(node), ['__proto__']);
  });
});

describe('sanitizeRequestBody (src/middleware/sanitize.ts)', () => {
  it('sanitizes the request body and continues', () => {
    const req = { method: 'POST', path: '/api/v1/creator/evaluate', body: JSON.parse('{"__proto__":{"a":1},"ok":1}') };

    assert.equal(runMiddleware(req), 1);
    assert.deepEqual(req.body, { ok: 1 });
  });

  it('continues when there is no body', () => {
    const req = { method: 'GET', path: '/api/health' };

    assert.equal(runMiddleware(req), 1);
  });

  it('leaves a clean body unchanged', () => {
    const req = { method: 'POST', path: '/api/v1/creator/preview', body: { answers: { name: 'agent' } } };

    assert.equal(runMiddleware(req), 1);
    assert.deepEqual(req.body, { answers: { name: 'agent' } });
  });

  it('ignores non-object bodies', () => {
    const req = { method: 'POST', path: '/api/v1/creator/preview', body: 'raw text' };

    assert.equal(runMiddleware(req), 1);
    assert.equal(req.body, 'raw text');
  });
});
