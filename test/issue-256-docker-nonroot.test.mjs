import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

describe('Issue #256: Docker agent-creator non-root', () => {

  it('Dockerfile.agent-creator runs as non-root user', () => {
    const df = fs.readFileSync('Dockerfile.agent-creator', 'utf8');
    assert.match(df, /USER\s+\w+/);
    assert.match(df, /adduser/);
  });

  it('does not install serve globally', () => {
    const df = fs.readFileSync('Dockerfile.agent-creator', 'utf8');
    assert.doesNotMatch(df, /npm install -g serve/);
  });

  it('uses local serve with pinned version', () => {
    const df = fs.readFileSync('Dockerfile.agent-creator', 'utf8');
    assert.match(df, /npm install.*--save-exact.*serve@/);
  });

  it('copies dist with correct ownership', () => {
    const df = fs.readFileSync('Dockerfile.agent-creator', 'utf8');
    assert.match(df, /--chown=.*dist/);
  });

  it('USER directive appears before CMD', () => {
    const df = fs.readFileSync('Dockerfile.agent-creator', 'utf8');
    const userPos = df.indexOf('USER ');
    const cmdPos = df.indexOf('CMD ');
    assert.ok(userPos > 0 && cmdPos > 0);
    assert.ok(userPos < cmdPos, 'USER should be before CMD');
  });
});
