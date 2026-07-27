import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

describe('Batch security hardening (#257,#260,#264,#266,#269,#270,#279,#283)', () => {
  it('#257: errorHandler uses case-insensitive production check', () => {
    const src = fs.readFileSync('src/middleware/errorHandler.ts', 'utf8');
    assert.match(src, /toLowerCase\(\).*===.*'production'/);
    // Ensure stack is never included in the response payload
    assert.doesNotMatch(src, /stack.*json\(/);
  });

  it('#257: errorHandler never includes stack in response body', () => {
    const src = fs.readFileSync('src/middleware/errorHandler.ts', 'utf8');
    assert.doesNotMatch(src, /stack.*json|json.*stack/);
  });

  it('#260: metrics token uses timing-safe comparison', () => {
    const src = fs.readFileSync('src/routes/metrics.ts', 'utf8');
    assert.match(src, /timingSafeEqual/);
  });

  it('#264: npm audit is blocking (no continue-on-error) with retry for registry errors', () => {
    const ci = fs.readFileSync('.github/workflows/ci.yml', 'utf8');
    const securitySection = ci.split('security:')[1] || '';
    // Audit must remain blocking — no blanket continue-on-error
    assert.doesNotMatch(securitySection, /continue-on-error:\s*true/);
    // npm audit command is still present
    assert.match(securitySection, /npm audit/);
    // Retry logic exists for registry brownouts
    assert.match(securitySection, /max_attempts=3/);
    // Real vulnerabilities still cause failure
    assert.match(securitySection, /exit \$exit_code/);
  });

  it('#269: production docker-compose does not use env_file', () => {
    const prod = fs.readFileSync('docker/docker-compose.production.yml', 'utf8');
    assert.match(prod, /env_file:\s*\[\]/);
    assert.match(prod, /AUTH_REQUIRED=true/);
  });

  it('#584: no database to back up (stateless Creator)', () => {
    assert.ok(!fs.existsSync('scripts/backup-db.sh'), 'backup script belongs to the removed runtime');
    const env = fs.readFileSync('.env.example', 'utf8');
    assert.doesNotMatch(env, /ARTEMISA_DB_PATH/);
  });

  it('#283: Next.js has security headers configured', () => {
    const config = fs.readFileSync('frontend/next.config.ts', 'utf8');
    assert.match(config, /X-Content-Type-Options/);
    assert.match(config, /X-Frame-Options/);
    assert.match(config, /Referrer-Policy/);
    assert.match(config, /headers\(\)/);
  });
});
