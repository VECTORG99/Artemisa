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

// These guard the two settings that silently break the cost or availability of
// the Azure deploy, plus the two that fail as a silent 403 for end users.
// They read infra/main.bicep as text on purpose: asserting on the compiled ARM
// would require a Bicep toolchain in CI for six regexes.
describe('Azure Container Apps deployment security (ADR-0009)', () => {
  const stripComments = (source) => source.replace(/^\s*\/\/.*$/gm, '');
  const bicep = stripComments(fs.readFileSync(path.resolve('infra/main.bicep'), 'utf8'));
  const workflow = fs.readFileSync(path.resolve('.github/workflows/deploy-azure.yml'), 'utf8');

  it('infra/main.bicep sets AUTH_REQUIRED=true', () => {
    assert.match(bicep, /name:\s*'AUTH_REQUIRED',\s*value:\s*'true'/);
  });

  it('infra/main.bicep enables NODE_ENV=production', () => {
    assert.match(bicep, /name:\s*'NODE_ENV',\s*value:\s*'production'/);
  });

  it('infra/main.bicep resolves ARTEMISA_API_KEYS from a secret, never inline', () => {
    assert.match(bicep, /name:\s*'ARTEMISA_API_KEYS',\s*secretRef:\s*'artemisa-api-keys'/);
    assert.doesNotMatch(bicep, /name:\s*'ARTEMISA_API_KEYS',\s*value:/);
  });

  it('infra/main.bicep marks METRICS_SECRET and BYPASS_SECRET @secure() and resolved by secretRef', () => {
    for (const [param, env] of [
      ['metricsSecret', 'METRICS_SECRET'],
      ['bypassSecret', 'BYPASS_SECRET'],
    ]) {
      assert.match(
        bicep,
        new RegExp(`@secure\\(\\)[\\s\\S]{0,200}param ${param}`),
        `${param} must be an @secure() parameter`,
      );
      assert.match(bicep, new RegExp(`name: '${env}',\\s*secretRef:`), `${env} must be resolved through secretRef`);
    }
  });

  it('infra/main.bicep sets TRUST_PROXY=1 so rate limiting keys on the real client IP', () => {
    // Container Apps terminates TLS. Without this, Express sees the proxy IP,
    // every user collapses onto one rate-limit bucket and real clients get
    // blocked after RATE_LIMIT_GLOBAL requests per minute.
    assert.match(bicep, /name:\s*'TRUST_PROXY',\s*value:\s*'1'/);
  });

  it('infra/main.bicep takes PUBLIC_BASE_URL from a parameter, not a hardcoded host', () => {
    assert.match(bicep, /name:\s*'PUBLIC_BASE_URL',\s*value:\s*publicBaseUrl/);
    assert.doesNotMatch(bicep, /PUBLIC_BASE_URL[^}\n]*https?:\/\//);
  });

  it('infra/main.bicep omits workloadProfiles from the environment', () => {
    // Omitted = Consumption-only. An empty array creates a workload profiles
    // environment that bills USD 0.10/h (~USD 73/month) with nothing running.
    assert.doesNotMatch(bicep, /workloadProfiles/);
  });

  it('infra/main.bicep attaches no Log Analytics or App Insights to the environment', () => {
    assert.doesNotMatch(bicep, /logAnalyticsConfiguration|appInsightsConfiguration/);
  });

  it('infra/main.bicep wires liveness and readiness to the existing health routes', () => {
    assert.match(bicep, /path:\s*'\/health\/live'/);
    assert.match(bicep, /path:\s*'\/health\/ready'/);
    assert.match(bicep, /minReplicas:\s*minReplicas/);
  });

  it('infra/main.bicep keeps the ACR credential out of GitHub as a secure parameter', () => {
    // A managed identity would be cleaner, but express environments reject
    // registries[].identity outright (ExpressEnvironmentFeatureNotSupported),
    // and the only alternative that accepts it bills ~USD 73/month. So the
    // admin credential is the pull path, and the invariant worth keeping is
    // that it arrives as a @secure() parameter and lives only in the
    // Container App's secret store.
    assert.match(bicep, /passwordSecretRef:\s*'acr-password'/);
    assert.match(bicep, /name:\s*'acr-password',\s*value:\s*acrPassword/);
    assert.match(bicep, /@secure\(\)[\s\S]{0,200}param acrPassword/);
    assert.doesNotMatch(bicep, /ghcr/);
  });

  it('workflow reads the ACR credential at deploy time instead of storing it as a secret', () => {
    assert.match(workflow, /az acr credential show/);
    // The value must reach the template through the private params file, not
    // as a command-line argument where it would land in a process list.
    assert.match(workflow, /"acrPassword":\s*\{ "value": "\$ACR_PASS" \}/);
    assert.doesNotMatch(workflow, /ACR_PASS=\$\{\{ secrets/);
  });

  it('workflow gates the deploy on /api/health and rolls back when the gate fails', () => {
    assert.match(workflow, /Health gate/);
    assert.match(workflow, /\/api\/health/);
    assert.match(workflow, /Roll back to the previous image/);
    assert.match(workflow, /if: failure\(\)/);
  });

  it('workflow authenticates to Azure with OIDC, not a stored client secret', () => {
    assert.match(workflow, /azure\/login@v2/);
    assert.match(workflow, /client-id:/);
    assert.doesNotMatch(workflow, /client-secret/i);
  });

  it('workflow passes secrets through a private file, never as CLI arguments', () => {
    assert.match(workflow, /--parameters\s+"@\$params"/);
    assert.match(workflow, /chmod 600 "\$params"/);
  });
});
