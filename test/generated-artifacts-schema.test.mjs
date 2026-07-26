import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { generateAgentBundle } from '../src/creator/generator.ts';
import { developmentAnswers, productionAnswers } from './creatorFixture.mjs';

function artifactsByPath(bundle) {
  return new Map(bundle.artifacts.map((artifact) => [artifact.path, artifact]));
}

const VALID_KINDS = new Set([
  'configuration',
  'documentation',
  'instruction',
  'manifest',
  'agents-md',
  'cursor-rules',
  'devin-rules',
  'coderabbit-config',
  'kilocode-rules',
]);

describe('Generated artifacts validate against multi-format contract (#488)', () => {
  for (const [label, answers] of [
    ['development answers', developmentAnswers],
    ['production answers', productionAnswers],
  ]) {
    it(`produces a valid manifest.json and blueprint.json for ${label}`, () => {
      const bundle = generateAgentBundle(answers);
      const byPath = artifactsByPath(bundle);

      const manifest = JSON.parse(byPath.get('manifest.json').content);
      assert.equal(typeof manifest.agent, 'string');
      assert.equal(typeof manifest.artifactCount, 'number');
      assert.ok(Array.isArray(manifest.targets));
      assert.ok(Array.isArray(manifest.files));
      for (const file of manifest.files) {
        assert.ok(typeof file.path === 'string' && file.path.length > 0);
        assert.ok(/^[a-f0-9]{64}$/.test(file.sha256), `invalid sha256 for ${file.path}`);
        assert.ok(VALID_KINDS.has(file.kind), `unexpected kind ${file.kind} for ${file.path}`);
      }

      const blueprint = JSON.parse(byPath.get('blueprint.json').content);
      assert.equal(blueprint.schemaVersion, '1.0.0');
      assert.ok(blueprint.identity.slug);
      assert.ok(blueprint.agent.targets.length > 0);
      assert.ok(blueprint.project.technologies.length > 0);
    });
  }

  it('generates a CodeRabbit YAML with required sections', () => {
    const bundle = generateAgentBundle(developmentAnswers);
    const yaml = bundle.artifacts.find((a) => a.path === '.coderabbit.yaml');
    assert.ok(yaml, '.coderabbit.yaml should be generated');
    assert.ok(yaml.content.includes('language: es'));
    assert.ok(yaml.content.includes('reviews:'));
    assert.ok(yaml.content.includes('path_instructions:'));
  });

  it('generates a valid Kilo Code modes JSON', () => {
    const bundle = generateAgentBundle(developmentAnswers);
    const modes = bundle.artifacts.find((a) => a.path === '.kilocodemodes');
    assert.ok(modes, '.kilocodemodes should be generated');
    const parsed = JSON.parse(modes.content);
    assert.equal(parsed.version, '1.0.0');
    assert.ok(Array.isArray(parsed.modes) && parsed.modes.length > 0);
    for (const mode of parsed.modes) {
      assert.ok(typeof mode.name === 'string');
      assert.ok(typeof mode.filePattern === 'string');
      assert.ok(Array.isArray(mode.allowedCommands));
    }
  });

  it('derives allowed commands from capabilities in rule files', () => {
    const bundle = generateAgentBundle(developmentAnswers);
    const cursorRules = bundle.artifacts.find((a) => a.path === '.cursorrules');
    assert.ok(cursorRules.content.includes('git:'), 'review-pr capability should allowlist git');

    const withRunTests = generateAgentBundle({ ...developmentAnswers, capabilities: ['read-repository', 'run-tests'] });
    const windsurf = withRunTests.artifacts.find((a) => a.path === `.windsurf/rules/${withRunTests.blueprint.identity.slug}.md`);
    assert.ok(windsurf.content.includes('npm:'), 'run-tests + TypeScript should allowlist npm');
  });

  it('does not include disallowed binaries for read-only agents', () => {
    const bundle = generateAgentBundle({
      ...developmentAnswers,
      capabilities: ['read-repository'],
    });
    const cursorRules = bundle.artifacts.find((a) => a.path === '.cursorrules');
    assert.ok(!cursorRules.content.includes('npm:'), 'read-only agent must not allowlist npm');
    assert.ok(cursorRules.content.includes('git:'), 'read-repository should still allow git');
  });
});
