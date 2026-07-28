import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateAgentBundle, slugify, stableValue, inferCloudProvider } from '../src/creator/generator.js';
import { CreatorInputError } from '../src/creator/domain.js';
import { developmentAnswers, productionAnswers } from './creatorFixture.mjs';

const slug = 'frontend-quality-guardian';

describe('Creator generator', () => {
  it('applies agent_persona verbatim to the generated system prompt', () => {
    const persona = 'Tono directo, sin rodeos, siempre cita la línea exacta del código.';
    const bundle = generateAgentBundle({ ...developmentAnswers, agent_persona: persona });
    const mdc = bundle.artifacts.find((a) => a.path === `.cursor/rules/${slug}.mdc`);
    assert.ok(mdc, 'Cursor mdc should be generated');
    assert.ok(mdc.content.includes(persona), 'system_prompt must include the persona text verbatim');
  });

  it('omits persona line when agent_persona is not answered', () => {
    const { agent_persona: _unused, ...withoutPersona } = developmentAnswers;
    const bundle = generateAgentBundle(withoutPersona);
    const mdc = bundle.artifacts.find((a) => a.path === `.cursor/rules/${slug}.mdc`);
    assert.ok(mdc, 'Cursor mdc should be generated');
    assert.ok(!mdc.content.includes('Estilo/tono/restricciones'));
  });

  it('generates multi-format artifacts for all selected targets', () => {
    const bundle = generateAgentBundle(developmentAnswers);
    const paths = bundle.artifacts.map((artifact) => artifact.path);
    for (const expected of [
      'blueprint.json',
      'manifest.json',
      'docs/INSTALL.md',
      'docs/WHY.md',
      'AGENTS.md',
      `.cursor/rules/${slug}.mdc`,
      '.cursorrules',
      `.windsurf/rules/${slug}.md`,
      '.windsurfrules',
      '.coderabbit.yaml',
      `.kilocode/rules/${slug}.md`,
      '.kilocodemodes',
      `.kiro/steering/${slug}.md`,
      `.kiro/hooks/${slug}-quality.json`,
      `.kiro/skills/${slug}/SKILL.md`,
      `skills/${slug}/SKILL.md`,
    ])
      assert.ok(paths.includes(expected), `missing ${expected}`);
    assert.equal(bundle.blueprint.prReview.enabled, true);
    assert.equal(bundle.manifest.artifactCount, bundle.artifacts.length);
    assert.equal(bundle.manifest.files.length, bundle.artifacts.length - 1);
    assert.ok(bundle.artifacts.every((artifact) => /^[a-f0-9]{64}$/.test(artifact.sha256)));
  });

  it('is deterministic for identical answers', () => {
    const first = generateAgentBundle(developmentAnswers);
    const second = generateAgentBundle(structuredClone(developmentAnswers));
    assert.deepEqual(first, second);
  });

  it('generates production guidance without Kiro or Cursor artifacts when omitted', () => {
    const bundle = generateAgentBundle(productionAnswers);
    const paths = bundle.artifacts.map((artifact) => artifact.path);
    assert.ok(bundle.applicationGuide.productionChecklist.length >= 4);
    assert.ok(paths.includes('blueprint.json'));
    assert.ok(paths.includes('AGENTS.md'));
    assert.ok(paths.includes('.coderabbit.yaml'));
    assert.ok(paths.includes('.windsurfrules'));
    assert.ok(!paths.some((path) => path.startsWith('.kiro/')));
    assert.ok(!paths.some((path) => path.startsWith('.cursor/')));
    assert.deepEqual(bundle.blueprint.environments.containerPlatforms, ['docker']);
    assert.deepEqual(bundle.blueprint.devops.infrastructure, ['terraform', 'ansible']);
    assert.ok(bundle.warnings.some((message) => message.includes('producción')));
  });

  it('quotes YAML frontmatter descriptions containing colons', () => {
    const bundle = generateAgentBundle({
      ...developmentAnswers,
      objective: 'Revisar cambios: explicar riesgos y correcciones.',
    });
    const skill = bundle.artifacts.find((file) => file.path === `skills/${slug}/SKILL.md`);
    const description = skill.content.split('\n').find((line) => line.startsWith('description: '));
    assert.equal(
      JSON.parse(description.slice('description: '.length)),
      'Revisar cambios: explicar riesgos y correcciones.',
    );
  });

  it('rejects an incomplete decision tree with 422 semantics', () => {
    assert.throws(
      () => generateAgentBundle({ agent_name: 'Incomplete' }),
      (error) => error instanceof CreatorInputError && error.statusCode === 422 && error.issues.length > 0,
    );
  });

  it('rejects literal secrets supplied in free text', () => {
    const answers = { ...developmentAnswers, objective: `Usar token ${'ghp_' + 'A'.repeat(30)} para revisar cambios.` };
    assert.throws(
      () => generateAgentBundle(answers),
      (error) => error instanceof CreatorInputError && error.statusCode === 422 && error.message.includes('secreto'),
    );
  });
});

describe('slugify', () => {
  it('lowercases and replaces spaces with dashes', () => {
    assert.equal(slugify('My Agent Name'), 'my-agent-name');
  });

  it('strips diacritics via NFKD normalization', () => {
    assert.equal(slugify('Código Fácil'), 'codigo-facil');
  });

  it('collapses consecutive non-alphanumeric chars into a single dash', () => {
    assert.equal(slugify('a---b___c...d'), 'a-b-c-d');
  });

  it('trims leading and trailing dashes', () => {
    assert.equal(slugify('---hello---'), 'hello');
  });

  it('returns generated-agent for empty string', () => {
    assert.equal(slugify(''), 'generated-agent');
  });

  it('returns generated-agent for only symbols', () => {
    assert.equal(slugify('!@#$%^&*()'), 'generated-agent');
  });

  it('returns generated-agent for only emojis', () => {
    assert.equal(slugify('🚀🎉🔥'), 'generated-agent');
  });

  it('truncates to 64 characters', () => {
    const long = 'a'.repeat(100);
    const result = slugify(long);
    assert.equal(result.length, 64);
    assert.equal(result, 'a'.repeat(64));
  });

  it('truncates after slugification, not before', () => {
    const long = 'Ñ'.repeat(80);
    const result = slugify(long);
    assert.ok(result.length <= 64);
    assert.equal(result, 'n'.repeat(64));
  });

  it('handles mixed unicode and ascii', () => {
    assert.equal(slugify('über-café_2024'), 'uber-cafe-2024');
  });

  it('handles single character input', () => {
    assert.equal(slugify('A'), 'a');
  });

  it('handles whitespace-only input', () => {
    assert.equal(slugify('   '), 'generated-agent');
  });
});

describe('stableValue', () => {
  it('sorts object keys alphabetically', () => {
    const result = stableValue({ z: 1, a: 2, m: 3 });
    assert.deepEqual(Object.keys(result), ['a', 'm', 'z']);
  });

  it('recursively sorts nested object keys', () => {
    const input = { b: { z: 1, a: 2 }, a: { y: 3, x: 4 } };
    const result = stableValue(input);
    assert.deepEqual(Object.keys(result), ['a', 'b']);
    assert.deepEqual(Object.keys(result.a), ['x', 'y']);
    assert.deepEqual(Object.keys(result.b), ['a', 'z']);
  });

  it('maps arrays preserving order and sorting inner objects', () => {
    const input = [
      { b: 1, a: 2 },
      { d: 3, c: 4 },
    ];
    const result = stableValue(input);
    assert.deepEqual(Object.keys(result[0]), ['a', 'b']);
    assert.deepEqual(Object.keys(result[1]), ['c', 'd']);
  });

  it('returns primitives unchanged', () => {
    assert.equal(stableValue(42), 42);
    assert.equal(stableValue('hello'), 'hello');
    assert.equal(stableValue(true), true);
    assert.equal(stableValue(null), null);
    assert.equal(stableValue(undefined), undefined);
  });

  it('handles empty object', () => {
    assert.deepEqual(stableValue({}), {});
  });

  it('handles empty array', () => {
    assert.deepEqual(stableValue([]), []);
  });

  it('handles deeply nested structures', () => {
    const input = { c: [{ z: { b: 1, a: 2 } }], a: 'x' };
    const result = stableValue(input);
    assert.deepEqual(Object.keys(result), ['a', 'c']);
    assert.deepEqual(Object.keys(result.c[0]), ['z']);
    assert.deepEqual(Object.keys(result.c[0].z), ['a', 'b']);
  });

  it('handles arrays with mixed types', () => {
    const input = [1, 'two', { b: 3, a: 4 }, null, [5]];
    const result = stableValue(input);
    assert.equal(result[0], 1);
    assert.equal(result[1], 'two');
    assert.deepEqual(Object.keys(result[2]), ['a', 'b']);
    assert.equal(result[3], null);
    assert.deepEqual(result[4], [5]);
  });
});

describe('inferCloudProvider', () => {
  it('maps aws- prefix to aws', () => {
    assert.equal(inferCloudProvider('aws-ec2'), 'aws');
    assert.equal(inferCloudProvider('aws-lambda'), 'aws');
    assert.equal(inferCloudProvider('aws-ecs'), 'aws');
  });

  it('maps azure- prefix to azure', () => {
    assert.equal(inferCloudProvider('azure-functions'), 'azure');
    assert.equal(inferCloudProvider('azure-aks'), 'azure');
  });

  it('maps gcp- prefix to gcp', () => {
    assert.equal(inferCloudProvider('gcp-cloudrun'), 'gcp');
    assert.equal(inferCloudProvider('gcp-gke'), 'gcp');
  });

  it('maps vercel to vercel', () => {
    assert.equal(inferCloudProvider('vercel'), 'vercel');
  });

  it('maps render to render', () => {
    assert.equal(inferCloudProvider('render'), 'render');
  });

  it('maps flyio to flyio', () => {
    assert.equal(inferCloudProvider('flyio'), 'flyio');
  });

  it('maps vps to self-managed', () => {
    assert.equal(inferCloudProvider('vps'), 'self-managed');
  });

  it('returns null for unknown targets', () => {
    assert.equal(inferCloudProvider('digitalocean'), null);
    assert.equal(inferCloudProvider('heroku'), null);
    assert.equal(inferCloudProvider(''), null);
  });

  it('does not match partial prefixes', () => {
    assert.equal(inferCloudProvider('awslambda'), null);
    assert.equal(inferCloudProvider('azurefunctions'), null);
    assert.equal(inferCloudProvider('gcprun'), null);
  });

  it('is case-sensitive', () => {
    assert.equal(inferCloudProvider('AWS-ec2'), null);
    assert.equal(inferCloudProvider('Vercel'), null);
    assert.equal(inferCloudProvider('VPS'), null);
  });
});
