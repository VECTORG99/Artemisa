import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateAgentBundle } from '../src/creator/generator.js';
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
    ]) assert.ok(paths.includes(expected), `missing ${expected}`);
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
    const bundle = generateAgentBundle({ ...developmentAnswers, objective: 'Revisar cambios: explicar riesgos y correcciones.' });
    const skill = bundle.artifacts.find((file) => file.path === `skills/${slug}/SKILL.md`);
    const description = skill.content.split('\n').find((line) => line.startsWith('description: '));
    assert.equal(JSON.parse(description.slice('description: '.length)), 'Revisar cambios: explicar riesgos y correcciones.');
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
