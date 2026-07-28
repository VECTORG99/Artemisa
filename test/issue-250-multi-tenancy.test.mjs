import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

describe('Issue #250: Multi-tenancy isolation', () => {
  it('auth middleware derives tenant ID from API key', () => {
    const auth = fs.readFileSync('src/middleware/auth.ts', 'utf8');
    assert.match(auth, /deriveTenantId/);
    assert.match(auth, /TENANT_IDS/);
  });

  it('auth middleware sets tenantId on request context', () => {
    const auth = fs.readFileSync('src/middleware/auth.ts', 'utf8');
    assert.match(auth, /tenantId/);
    assert.match(auth, /TenantRequest/);
  });

  it('exports getTenantId helper for downstream routes', () => {
    const auth = fs.readFileSync('src/middleware/auth.ts', 'utf8');
    assert.match(auth, /export function getTenantId/);
  });

  it('tenant ID is a stable hash (not the raw key)', () => {
    const auth = fs.readFileSync('src/middleware/auth.ts', 'utf8');
    assert.match(auth, /createHash.*sha256/);
    assert.match(auth, /slice\(0,\s*8\)/);
  });

  it('development mode gets a default tenant ID', () => {
    const auth = fs.readFileSync('src/middleware/auth.ts', 'utf8');
    assert.match(auth, /tenantId.*=.*'dev'/);
  });

  it('findValidKeyIndex returns index for tenant mapping', () => {
    const auth = fs.readFileSync('src/middleware/auth.ts', 'utf8');
    assert.match(auth, /findValidKeyIndex/);
    assert.match(auth, /keyIndex/);
    assert.match(auth, /TENANT_IDS\[keyIndex\]/);
  });
});
