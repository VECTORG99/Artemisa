import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('DigitalOcean deployment security', () => {
  const appYaml = fs.readFileSync(path.resolve('.do/app.yaml'), 'utf8');

  it('.do/app.yaml sets AUTH_REQUIRED=true', () => {
    assert.match(appYaml, /AUTH_REQUIRED[\s\S]*?value:\s*["']?true["']?/);
  });

  it('.do/app.yaml marks ARTEMISA_API_KEYS as SECRET', () => {
    assert.match(appYaml, /ARTEMISA_API_KEYS[\s\S]*?type:\s*SECRET/);
  });

  it('.do/app.yaml sets NODE_ENV=production', () => {
    assert.match(appYaml, /NODE_ENV[\s\S]*?value:\s*production/);
  });

  it('.do/app.yaml marks METRICS_SECRET as SECRET', () => {
    assert.match(appYaml, /METRICS_SECRET[\s\S]*?type:\s*SECRET/);
  });

  it('frontend api.ts does NOT hardcode a production URL', () => {
    const apiTs = fs.readFileSync(path.resolve('frontend/src/lib/api.ts'), 'utf8');
    assert.doesNotMatch(apiTs, /onrender\.com/);
    assert.doesNotMatch(apiTs, /ondigitalocean\.app/);
    assert.doesNotMatch(apiTs, /https:\/\/artemisa\./);
  });

  it('frontend api.ts falls back to localhost (safe default)', () => {
    const apiTs = fs.readFileSync(path.resolve('frontend/src/lib/api.ts'), 'utf8');
    assert.match(apiTs, /process\.env\.NEXT_PUBLIC_API_URL \|\| ['"]http:\/\/localhost:3001['"]/);
  });
});
