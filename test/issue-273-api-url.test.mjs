import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

describe('Issue #273: Frontend API URL safe default', () => {

  it('defaults to localhost:3001, not a production URL', () => {
    const api = fs.readFileSync('frontend/src/lib/api.ts', 'utf8');
    assert.match(api, /NEXT_PUBLIC_API_URL.*\|\|.*['"]http:\/\/localhost:3001['"]/);
    assert.doesNotMatch(api, /onrender\.com/);
    assert.doesNotMatch(api, /artemisa\./);
  });

  it('warns in development if API URL is non-local', () => {
    const api = fs.readFileSync('frontend/src/lib/api.ts', 'utf8');
    assert.match(api, /console\.warn/);
    assert.match(api, /non-local address/);
  });

  it('next.config.ts warns on production build without NEXT_PUBLIC_API_URL', () => {
    const config = fs.readFileSync('frontend/next.config.ts', 'utf8');
    assert.match(config, /NEXT_PUBLIC_API_URL/);
    assert.match(config, /production.*build/i);
  });

  it('frontend/.env.example documents the variable', () => {
    const env = fs.readFileSync('frontend/.env.example', 'utf8');
    assert.match(env, /NEXT_PUBLIC_API_URL/);
    assert.match(env, /localhost:3001/);
  });
});
