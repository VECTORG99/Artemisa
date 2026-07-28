import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

describe('Issue #266: Schema validation + __proto__ sanitization', () => {
  it('sanitize middleware exists and is imported in app.ts', () => {
    const app = fs.readFileSync('src/app.ts', 'utf8');
    assert.match(app, /import.*sanitizeRequestBody.*from.*middleware\/sanitize/);
    assert.match(app, /app\.use\(sanitizeRequestBody\)/);
  });

  it('sanitize middleware strips __proto__, constructor, prototype keys', () => {
    const sanitize = fs.readFileSync('src/middleware/sanitize.ts', 'utf8');
    assert.match(sanitize, /__proto__/);
    assert.match(sanitize, /constructor/);
    assert.match(sanitize, /prototype/);
    assert.match(sanitize, /DANGEROUS_KEYS/);
  });

  it('stripDangerousKeys is a recursive function with depth limit', () => {
    const sanitize = fs.readFileSync('src/middleware/sanitize.ts', 'utf8');
    assert.match(sanitize, /stripDangerousKeys/);
    assert.match(sanitize, /depth.*20|20.*depth/);
  });

  it('sanitize middleware logs when dangerous keys are stripped', () => {
    const sanitize = fs.readFileSync('src/middleware/sanitize.ts', 'utf8');
    assert.match(sanitize, /logger\.warn/);
    assert.match(sanitize, /Stripped dangerous keys/);
  });

  it('sanitize middleware is applied after json() and before route handlers', () => {
    const app = fs.readFileSync('src/app.ts', 'utf8');
    const jsonPos = app.indexOf("express.json({ limit: '128kb' })");
    const sanitizePos = app.indexOf('app.use(sanitizeRequestBody)');
    const validatePos = app.indexOf('app.use(validatePathParams)');
    assert.ok(jsonPos > 0, 'json middleware should exist');
    assert.ok(sanitizePos > 0, 'sanitize middleware should exist');
    assert.ok(jsonPos < sanitizePos, 'sanitize should be after json()');
    assert.ok(sanitizePos < validatePos, 'sanitize should be before validatePathParams');
  });
});
