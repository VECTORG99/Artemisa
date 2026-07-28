import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

describe('Dependency vulnerability fixes (issue #240)', () => {
  const frontendPkg = JSON.parse(fs.readFileSync(path.resolve('frontend/package.json'), 'utf8'));

  it('Next.js is updated to >=16.2.11 (latest stable with security patches)', () => {
    const version = frontendPkg.dependencies.next;
    // 16.2.11 is the latest stable; semver parse the pinned version
    const [major, minor, patch] = version.split('.').map(Number);
    assert.ok(major >= 16, 'major >= 16');
    assert.ok(minor >= 2, 'minor >= 2');
    assert.ok(patch >= 11, 'patch >= 11');
  });

  it('sharp is not a direct dependency (Next.js uses it optionally at runtime)', () => {
    const sharp = frontendPkg.dependencies.sharp;
    assert.equal(sharp, undefined, 'sharp should not be a direct dependency');
  });

  it('eslint-config-next removed (lint is optional, not part of build)', () => {
    const eslintNext = frontendPkg.devDependencies['eslint-config-next'];
    assert.equal(eslintNext, undefined, 'eslint-config-next should be removed');
  });

  it('runtime dependencies are gone with the runtime (#584)', () => {
    const rootPkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
    const removed = [
      '@modelcontextprotocol/sdk',
      'ai',
      '@ai-sdk/openai',
      '@ai-sdk/anthropic',
      'openai',
      '@anthropic-ai/sdk',
      'better-sqlite3',
    ];
    for (const dep of removed) {
      assert.equal(rootPkg.dependencies[dep], undefined, `${dep} should not be a backend dependency`);
      assert.equal(rootPkg.devDependencies[dep], undefined, `${dep} should not be a backend devDependency`);
    }
    assert.equal(rootPkg.devDependencies['@types/better-sqlite3'], undefined, 'sqlite types should be removed');
  });

  it('next version is pinned (not a range) for reproducibility', () => {
    const version = frontendPkg.dependencies.next;
    assert.doesNotMatch(version, /[\^~]/, 'next should be pinned, not a range');
  });
});
