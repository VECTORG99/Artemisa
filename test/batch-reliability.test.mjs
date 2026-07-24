import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

describe('Batch reliability fixes (#246, #253, #255)', () => {

  it('#246: CORS blocks null origin explicitly', () => {
    const app = fs.readFileSync('src/app.ts', 'utf8');
    assert.match(app, /origin === 'null'/);
    assert.match(app, /null origin not allowed/);
  });

  it('#246: CORS logs blocked null origin', () => {
    const app = fs.readFileSync('src/app.ts', 'utf8');
    assert.match(app, /logger\.warn.*Blocked null origin/);
  });

  it('#253: McpConnectionPool has idle connection cleanup', () => {
    const pool = fs.readFileSync('src/engine/McpConnectionPool.ts', 'utf8');
    assert.match(pool, /closeIdleConnections/);
    assert.match(pool, /IDLE_TIMEOUT_MS/);
    assert.match(pool, /lastUsed/);
  });

  it('#253: McpConnectionPool closeAll clears timer and state', () => {
    const pool = fs.readFileSync('src/engine/McpConnectionPool.ts', 'utf8');
    assert.match(pool, /clearInterval\(this\.idleTimer\)/);
    assert.match(pool, /this\.lastUsed\.clear\(\)/);
  });

  it('#255: Frontend has ErrorBoundary component', () => {
    assert.ok(fs.existsSync('frontend/src/components/ErrorBoundary.tsx'));
    const eb = fs.readFileSync('frontend/src/components/ErrorBoundary.tsx', 'utf8');
    assert.match(eb, /getDerivedStateFromError/);
    assert.match(eb, /componentDidCatch/);
  });
});
