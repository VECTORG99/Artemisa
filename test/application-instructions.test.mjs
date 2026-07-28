import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { generateAgentBundle as generateAgentGenerateResponse } from '../src/creator/agentProtocol.js';
import { developmentAnswers } from './creatorFixture.mjs';

// Issue #720: `application_instructions` was a hand-written string per target,
// so it drifted from the artifacts the generator actually produces: `portable`
// pointed at an `AGENTS.md` it never generates, and `cursor`, `devin-desktop`
// and `kilo-code` omitted their root rule file (`.cursorrules`,
// `.windsurfrules`, `.kilocodemodes`). The text is now derived from the paths.

const TARGETS = ['agents-md', 'cursor', 'devin-desktop', 'coderabbit', 'kilo-code', 'kiro', 'portable'];

function bundleFor(targets) {
  return generateAgentGenerateResponse({ answers: { ...developmentAnswers, agent_targets: targets } });
}

/** Artefacts that belong to a target = those only present when it is selected. */
function pathsOwnedByTarget(target) {
  const withTarget = new Set(bundleFor([target]).manifest.files.map((file) => file.path));
  const baseline = new Set(bundleFor(['agents-md']).manifest.files.map((file) => file.path));
  if (target === 'agents-md') return [...withTarget].filter((path) => path === 'AGENTS.md');
  return [...withTarget].filter((path) => !baseline.has(path));
}

describe('application_instructions matches the generated artifacts (issue #720)', () => {
  const bundle = bundleFor(TARGETS);

  it('covers every selected target', () => {
    assert.deepEqual(Object.keys(bundle.application_instructions).sort(), [...TARGETS].sort());
  });

  it('names every file the target generates', () => {
    for (const target of TARGETS) {
      const instruction = bundle.application_instructions[target];
      for (const path of pathsOwnedByTarget(target)) {
        const file = path.slice(path.lastIndexOf('/') + 1);
        assert.ok(
          instruction.includes(path) || instruction.includes(file),
          `${target}: "${instruction}" does not mention ${path}`,
        );
      }
    }
  });

  it('never mentions a file the target does not generate', () => {
    const generated = new Set(bundle.manifest.files.map((file) => file.path));
    for (const target of TARGETS) {
      const instruction = bundle.application_instructions[target];
      // Any token that looks like a file must exist in the manifest.
      const tokens = instruction.match(/[\w.@/-]+\.(?:md|mdc|json|ya?ml)/g) ?? [];
      for (const token of tokens) {
        const matches = [...generated].some((path) => path === token || path.endsWith(`/${token}`));
        assert.ok(matches, `${target}: mentions ${token}, which is not generated`);
      }
    }
  });

  it('portable points at its skill file, not at AGENTS.md', () => {
    const instruction = bundle.application_instructions.portable;
    assert.match(instruction, /SKILL\.md/);
    assert.doesNotMatch(instruction, /AGENTS\.md/);
  });

  it('includes the root rule files that used to be omitted', () => {
    assert.match(bundle.application_instructions.cursor, /\.cursorrules/);
    assert.match(bundle.application_instructions['devin-desktop'], /\.windsurfrules/);
    assert.match(bundle.application_instructions['kilo-code'], /\.kilocodemodes/);
  });

  it('keeps the correct instructions for the targets that were already right', () => {
    assert.match(bundle.application_instructions.coderabbit, /Copia \.coderabbit\.yaml a la raíz del repositorio\./);
    assert.match(bundle.application_instructions['agents-md'], /Copia AGENTS\.md a la raíz del repositorio\./);
    assert.match(bundle.application_instructions.kiro, /\.kiro\/steering\//);
  });

  it('is deterministic: same answers produce the same instructions', () => {
    assert.deepEqual(bundleFor(TARGETS).application_instructions, bundle.application_instructions);
  });

  it('distinguishes directory placement from root placement', () => {
    // Cursor generates one file in a directory and one in the root; both
    // placements must be stated.
    const cursor = bundle.application_instructions.cursor;
    assert.match(cursor, /Crea \.cursor\/rules\/ en la raíz del proyecto y copia allí/);
    assert.match(cursor, /a la raíz del repositorio\./);
  });
});
