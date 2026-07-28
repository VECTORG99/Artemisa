import { describe, expect, it } from 'vitest';

import { getArtifactPlatform } from './completion-screen';

// Issue #732: the platforms tab groups artifacts by path, and everything that
// did not match a platform prefix fell into `portable`. That told the user
// (and any agent reading the UI) that manifest.json, blueprint.json and the
// docs were portable-target configuration.

const PLATFORM_PATHS: Array<[string, string]> = [
  ['.cursorrules', 'cursor'],
  ['.cursor/rules/agente.mdc', 'cursor'],
  ['.windsurfrules', 'devin-desktop'],
  ['.windsurf/rules/agente.md', 'devin-desktop'],
  ['.coderabbit.yaml', 'coderabbit'],
  ['.kilocodemodes', 'kilo-code'],
  ['.kilocode/rules/agente.md', 'kilo-code'],
  ['.kiro/steering/agente.md', 'kiro'],
  ['.kiro/skills/agente/SKILL.md', 'kiro'],
  ['.kiro/hooks/agente-quality.json', 'kiro'],
  ['AGENTS.md', 'portable'],
  ['skills/agente/SKILL.md', 'portable'],
  ['skills/debug-diagnose/SKILL.md', 'portable'],
];

// Present in every bundle regardless of the selected targets.
const SHARED_PATHS = [
  'blueprint.json',
  'manifest.json',
  'PROMPT.md',
  'mcp.json',
  'docs/INSTALL.md',
  'docs/WHY.md',
  'artemisa/steering.json',
];

describe('getArtifactPlatform', () => {
  it('maps each platform artifact to its platform', () => {
    for (const [path, platform] of PLATFORM_PATHS) {
      expect(getArtifactPlatform(path), path).toBe(platform);
    }
  });

  it('groups the bundle-wide artifacts apart from every platform', () => {
    for (const path of SHARED_PATHS) {
      expect(getArtifactPlatform(path), path).toBe('shared');
    }
  });

  it('never labels a shared artifact as portable', () => {
    for (const path of SHARED_PATHS) {
      expect(getArtifactPlatform(path), path).not.toBe('portable');
    }
  });

  it('keeps the portable target owning AGENTS.md and skills', () => {
    expect(getArtifactPlatform('AGENTS.md')).toBe('portable');
    expect(getArtifactPlatform('skills/whatever/SKILL.md')).toBe('portable');
  });
});
