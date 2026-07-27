import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateAgentBundle,
  inferCloudProvider,
  slugify,
  stableValue,
} from '../src/creator/generator.js';
import { CreatorInputError } from '../src/creator/domain.js';
import { developmentAnswers, productionAnswers } from './creatorFixture.mjs';

describe('Creator generator', () => {
  it('applies agent_persona verbatim to the generated system prompt', () => {
    const persona = 'Tono directo, sin rodeos, siempre cita la línea exacta del código.';
    const bundle = generateAgentBundle({ ...developmentAnswers, agent_persona: persona });
    const steering = JSON.parse(bundle.artifacts.find((a) => a.path === 'huascar/steering.json').content);
    const [role] = Object.values(steering.roles);
    assert.ok(role.system_prompt.includes(persona), 'system_prompt must include the persona text verbatim');
  });

  it('omits persona line when agent_persona is not answered', () => {
    const { agent_persona: _unused, ...withoutPersona } = developmentAnswers;
    const bundle = generateAgentBundle(withoutPersona);
    const steering = JSON.parse(bundle.artifacts.find((a) => a.path === 'huascar/steering.json').content);
    const [role] = Object.values(steering.roles);
    assert.ok(!role.system_prompt.includes('Estilo/tono/restricciones'));
  });

  it('generates Huascar, Kiro, portable, RAG, PR and skill artifacts when applicable', () => {
    const bundle = generateAgentBundle(developmentAnswers);
    const paths = bundle.artifacts.map(artifact => artifact.path);
    for (const expected of [
      'huascar.blueprint.json',
      'manifest.json',
      'docs/INSTALL.md',
      'docs/WHY.md',
      'AGENTS.md',
      'huascar/steering.json',
      'huascar/security-policy.json',
      'huascar/mcps.json',
      'huascar/rag.json',
      'huascar/pr-review.json',
      '.kiro/steering/frontend-quality-guardian.md',
      '.kiro/hooks/frontend-quality-guardian-quality.json',
      '.kiro/skills/frontend-quality-guardian/SKILL.md',
      'skills/frontend-quality-guardian/SKILL.md',
    ]) assert.ok(paths.includes(expected), `missing ${expected}`);
    assert.equal(bundle.blueprint.prReview.enabled, true);
    assert.equal(bundle.manifest.artifactCount, bundle.artifacts.length);
    assert.equal(bundle.manifest.files.length, bundle.artifacts.length - 1);
    assert.ok(bundle.artifacts.every(artifact => /^[a-f0-9]{64}$/.test(artifact.sha256)));
  });

  it('is deterministic for identical answers', () => {
    const first = generateAgentBundle(developmentAnswers);
    const second = generateAgentBundle(structuredClone(developmentAnswers));
    assert.deepEqual(first, second);
  });

  it('generates production guidance without Kiro or PR artifacts when omitted', () => {
    const bundle = generateAgentBundle(productionAnswers);
    const paths = bundle.artifacts.map(artifact => artifact.path);
    assert.ok(bundle.applicationGuide.productionChecklist.length >= 4);
    assert.ok(paths.includes('huascar/steering.json'));
    assert.ok(paths.includes('huascar/governance.json'));
    assert.ok(!paths.some(path => path.startsWith('.kiro/')));
    assert.ok(!paths.includes('huascar/pr-review.json'));
    assert.deepEqual(bundle.blueprint.environments.containerPlatforms, ['docker']);
    assert.deepEqual(bundle.blueprint.devops.infrastructure, ['terraform', 'ansible']);
    assert.ok(bundle.warnings.some(message => message.includes('producción')));

    const policy = JSON.parse(bundle.artifacts.find(file => file.path === 'huascar/security-policy.json').content);
    assert.ok(policy.blocked_tool_patterns.length > 0);
    assert.ok(policy.blocked_args_substrings.execute_bash.length > 0);
    assert.equal(policy.default_filesystem_mode, 'read-only');
    assert.ok(Array.isArray(policy.require_approval_patterns));
  });

  it('quotes YAML frontmatter descriptions containing colons', () => {
    const bundle = generateAgentBundle({ ...developmentAnswers, objective: 'Revisar cambios: explicar riesgos y correcciones.' });
    const skill = bundle.artifacts.find(file => file.path === 'skills/frontend-quality-guardian/SKILL.md');
    const description = skill.content.split('\n').find(line => line.startsWith('description: '));
    assert.equal(JSON.parse(description.slice('description: '.length)), 'Revisar cambios: explicar riesgos y correcciones.');
  });

  it('rejects an incomplete decision tree with 422 semantics', () => {
    assert.throws(
      () => generateAgentBundle({ agent_name: 'Incomplete' }),
      error => error instanceof CreatorInputError && error.statusCode === 422 && error.issues.length > 0,
    );
  });

  it('rejects literal secrets supplied in free text', () => {
    const answers = { ...developmentAnswers, objective: `Usar token ${'ghp_' + 'A'.repeat(30)} para revisar cambios.` };
    assert.throws(
      () => generateAgentBundle(answers),
      error => error instanceof CreatorInputError && error.statusCode === 422 && error.message.includes('secreto'),
    );
  });
});

describe('slugify', () => {
  it('normalizes emojis and symbol-only or empty names', () => {
    assert.equal(slugify('🚀 Agente de revisión 🤖'), 'agente-de-revision');
    assert.equal(slugify('🚀 !@#$ 🤖'), 'generated-agent');
    assert.equal(slugify(''), 'generated-agent');
  });

  it('limits slugs to 64 characters', () => {
    assert.equal(slugify('A'.repeat(80)), 'a'.repeat(64));
  });
});

describe('stableValue', () => {
  it('sorts object keys recursively while preserving array order', () => {
    assert.deepEqual(
      stableValue({
        z: [{ beta: 2, alpha: 1 }, null],
        a: { delta: 4, charlie: 3 },
      }),
      {
        a: { charlie: 3, delta: 4 },
        z: [{ alpha: 1, beta: 2 }, null],
      },
    );
  });

  it('preserves null and undefined values', () => {
    assert.equal(stableValue(null), null);
    assert.equal(stableValue(undefined), undefined);
    assert.deepEqual(stableValue([undefined, null]), [undefined, null]);
  });
});

describe('inferCloudProvider', () => {
  it('maps deployment targets to cloud providers', () => {
    const cases = [
      ['aws-ecs', 'aws'],
      ['azure-container-apps', 'azure'],
      ['gcp-cloud-run', 'gcp'],
      ['vercel', 'vercel'],
      ['render', 'render'],
      ['flyio', 'flyio'],
      ['vps', 'self-managed'],
      ['custom-platform', null],
    ];

    for (const [target, expected] of cases) {
      assert.equal(inferCloudProvider(target), expected, target);
    }
  });
});
