import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { developmentAnswers } from './creatorFixture.mjs';

const BASE_URL = 'http://localhost:0'; // Not actually used — we call the generator directly.

// We import the generator through the API layer to test the full path.
const { generateAgentBundle } = await import('../src/creator/generator.js');

describe('testing_tools consumption in bundle', () => {
  it('blueprint includes testing.tools from the answer', () => {
    const bundle = generateAgentBundle(developmentAnswers);
    assert.deepEqual(bundle.blueprint.testing.tools, ['unit-tests', 'e2e-tests', 'sast']);
  });

  it('AGENTS.md lists selected testing tools', () => {
    const bundle = generateAgentBundle(developmentAnswers);
    const agentsMd = bundle.artifacts.find((a) => a.path.endsWith('AGENTS.md'));
    assert.ok(agentsMd, 'AGENTS.md must be generated');
    assert.ok(agentsMd.content.includes('Testing & Quality'), 'Must have Testing & Quality section');
    assert.ok(agentsMd.content.includes('Pruebas unitarias'), 'Must list unit-tests label');
    assert.ok(agentsMd.content.includes('end-to-end'), 'Must list e2e-tests label');
    assert.ok(agentsMd.content.includes('SAST'), 'Must list sast label');
  });

  it('allowed commands include e2e runners when e2e-tests selected', () => {
    const bundle = generateAgentBundle(developmentAnswers);
    // The steering or kiro hook should contain playwright or cypress
    const allContent = bundle.artifacts.map((a) => a.content).join('\n');
    assert.ok(
      allContent.includes('playwright test') || allContent.includes('cypress run'),
      'Must include e2e runner in allowed commands',
    );
  });

  it('allowed commands include sast tools when sast selected', () => {
    const bundle = generateAgentBundle(developmentAnswers);
    const allContent = bundle.artifacts.map((a) => a.content).join('\n');
    assert.ok(
      allContent.includes('eslint') || allContent.includes('semgrep'),
      'Must include SAST tool in allowed commands',
    );
  });

  it('empty testing_tools produces no extra commands', () => {
    const noTools = { ...developmentAnswers, testing_tools: [] };
    const bundle = generateAgentBundle(noTools);
    const agentsMd = bundle.artifacts.find((a) => a.path.endsWith('AGENTS.md'));
    assert.ok(agentsMd.content.includes('Sin herramientas de testing específicas'));
  });
});
