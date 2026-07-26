import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateAgentBundle } from '../src/creator/generator.js';
import { developmentAnswers, productionAnswers } from './creatorFixture.mjs';

describe('Creator multi-format generator bug fixes (#488)', () => {
  it('does not generate huascar/ artifacts', () => {
    const bundle = generateAgentBundle(developmentAnswers);
    const huascar = bundle.artifacts.filter((a) => a.path.startsWith('huascar/'));
    assert.deepEqual(huascar, []);
  });

  it('generates a blueprint.json manifest and docs for every bundle', () => {
    const bundle = generateAgentBundle(developmentAnswers);
    const paths = bundle.artifacts.map((a) => a.path);
    for (const expected of ['blueprint.json', 'docs/INSTALL.md', 'docs/WHY.md', 'manifest.json']) {
      assert.ok(paths.includes(expected), `missing ${expected}`);
    }
  });

  it('produces Cursor and Devin Desktop rules when selected', () => {
    const bundle = generateAgentBundle(developmentAnswers);
    const paths = bundle.artifacts.map((a) => a.path);
    assert.ok(paths.some((p) => p.startsWith('.cursor/')));
    assert.ok(paths.some((p) => p.startsWith('.windsurf/')));
  });

  it('produces CodeRabbit and Kilo Code config when selected', () => {
    const bundle = generateAgentBundle(developmentAnswers);
    const paths = bundle.artifacts.map((a) => a.path);
    assert.ok(paths.includes('.coderabbit.yaml'));
    assert.ok(paths.some((p) => p.startsWith('.kilocode/')));
  });

  it('produces Kiro and portable artifacts when selected', () => {
    const bundle = generateAgentBundle(developmentAnswers);
    const paths = bundle.artifacts.map((a) => a.path);
    assert.ok(paths.some((p) => p.startsWith('.kiro/')));
    assert.ok(paths.some((p) => p.startsWith('skills/')));
    assert.ok(paths.includes('AGENTS.md'));
  });

  it('INSTALL.md includes dev and prod sections conditionally', () => {
    const devBundle = generateAgentBundle(developmentAnswers);
    const devInstall = devBundle.artifacts.find((a) => a.path === 'docs/INSTALL.md');
    assert.ok(devInstall.content.includes('Uso en desarrollo'));
    assert.ok(!devInstall.content.includes('Paso a producción'));

    const prodBundle = generateAgentBundle(productionAnswers);
    const prodInstall = prodBundle.artifacts.find((a) => a.path === 'docs/INSTALL.md');
    assert.ok(prodInstall.content.includes('Paso a producción'));
  });
});
