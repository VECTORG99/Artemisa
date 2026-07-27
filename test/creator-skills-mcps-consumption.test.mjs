import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateAgentBundle } from '../src/creator/generator.js';
import { developmentAnswers, productionAnswers } from './creatorFixture.mjs';

describe('Creator consumes skills_selection and mcps_selection (#434)', () => {
  it('generates a skills/<id>/SKILL.md artifact for each explicitly selected skill', () => {
    const bundle = generateAgentBundle(developmentAnswers);
    const paths = bundle.artifacts.map((a) => a.path);

    assert.ok(paths.includes('skills/debug-diagnose/SKILL.md'), 'debug-diagnose skill missing');
    assert.ok(paths.includes('skills/security-code-review/SKILL.md'), 'security-code-review skill missing');

    const skill = bundle.artifacts.find((a) => a.path === 'skills/debug-diagnose/SKILL.md');
    assert.ok(skill.content.includes('# Debug & Diagnose'));
    assert.ok(skill.content.includes('focus: development'));
  });

  it('persists the resolved skill selection in blueprint.skills', () => {
    const bundle = generateAgentBundle(developmentAnswers);
    assert.equal(bundle.blueprint.skills.enabled, true);
    assert.equal(bundle.blueprint.skills.focus, 'custom');
    const ids = bundle.blueprint.skills.items.map((item) => item.id);
    assert.deepEqual(ids, ['debug-diagnose', 'security-code-review']);
  });

  it('does not generate catalog skill artifacts for non-custom focus profiles', () => {
    // productionAnswers uses skills_focus: 'operations' with no skills_selection.
    const bundle = generateAgentBundle(productionAnswers);
    const catalogSkillPaths = bundle.artifacts
      .map((a) => a.path)
      .filter((p) => p.startsWith('skills/') && p.endsWith('/SKILL.md'));
    // Only the agent portable skill (skills/<slug>/SKILL.md) may exist.
    assert.ok(catalogSkillPaths.every((p) => p === `skills/${bundle.blueprint.identity.slug}/SKILL.md`));
    assert.deepEqual(bundle.blueprint.skills.items, []);
  });

  it('generates a portable mcp.json manifest for selected MCP servers', () => {
    const bundle = generateAgentBundle(developmentAnswers);
    const mcp = bundle.artifacts.find((a) => a.path === 'mcp.json');
    assert.ok(mcp, 'mcp.json should be generated when mcps_selection is non-empty');
    const parsed = JSON.parse(mcp.content);
    assert.equal(parsed.agent, bundle.blueprint.identity.slug);
    assert.deepEqual(
      parsed.servers.map((s) => s.id),
      ['github-mcp-server'],
    );
    assert.equal(parsed.servers[0].category, 'version-control');
  });

  it('persists the resolved MCP selection in blueprint.integrations.mcps', () => {
    const bundle = generateAgentBundle(developmentAnswers);
    assert.deepEqual(
      bundle.blueprint.integrations.mcps.map((m) => m.id),
      ['github-mcp-server'],
    );
  });

  it('includes an MCP Integrations section in AGENTS.md when MCPs are selected', () => {
    const bundle = generateAgentBundle(developmentAnswers);
    const agentsMd = bundle.artifacts.find((a) => a.path === 'AGENTS.md');
    assert.ok(agentsMd.content.includes('## MCP Integrations'));
    assert.ok(agentsMd.content.includes('GitHub MCP'));
  });

  it('omits mcp.json and clears integrations when mcps_enabled is false', () => {
    const bundle = generateAgentBundle({ ...developmentAnswers, mcps_enabled: false });
    const paths = bundle.artifacts.map((a) => a.path);
    assert.ok(!paths.includes('mcp.json'));
    assert.deepEqual(bundle.blueprint.integrations.mcps, []);
    const agentsMd = bundle.artifacts.find((a) => a.path === 'AGENTS.md');
    assert.ok(agentsMd.content.includes('No se habilitaron integraciones MCP.'));
  });

  it('remains deterministic with skills and mcp selections', () => {
    const first = generateAgentBundle(developmentAnswers);
    const second = generateAgentBundle(structuredClone(developmentAnswers));
    assert.deepEqual(first, second);
  });
});
