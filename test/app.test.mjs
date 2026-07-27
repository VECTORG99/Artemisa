import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('app module', () => {
  it('exports express app without listening', async () => {
    const { app } = await import(`../src/app.js?case=${Date.now()}`);
    assert.strictEqual(typeof app.use, 'function');
  });

  it('does not export a persistence store (#584)', async () => {
    const mod = await import(`../src/app.js?case=${Date.now()}`);
    assert.strictEqual(mod.store, undefined);
  });
});
