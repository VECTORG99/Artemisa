import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getSkillsCatalog, getSkillById, skillsCatalog } from '../src/creator/skillsCatalog.ts';
import { getMcpCatalog, getMcpById, mcpCatalog } from '../src/creator/mcpCatalog.ts';

describe('Skills catalog', () => {
  it('every item has a source link and non-empty description', () => {
    for (const item of skillsCatalog) {
      assert.ok(item.sourceUrl.startsWith('https://'), `${item.id} must have an https sourceUrl`);
      assert.ok(item.description.length > 0, `${item.id} must have a description`);
    }
  });

  it('filters by focus', () => {
    const result = getSkillsCatalog({ focus: 'security' });
    assert.ok(result.items.length > 0);
    assert.ok(result.items.every((item) => item.focus === 'security'));
  });

  it('filters by free-text query across name/description/tags', () => {
    const result = getSkillsCatalog({ q: 'debug' });
    assert.ok(result.items.some((item) => item.id === 'debug-diagnose'));
  });

  it('returns everything when no filter is given', () => {
    const result = getSkillsCatalog();
    assert.strictEqual(result.items.length, skillsCatalog.length);
  });

  it('getSkillById returns the correct item for a valid id', () => {
    const item = getSkillById('debug-diagnose');
    assert.ok(item);
    assert.strictEqual(item.name, 'Debug & Diagnose');
  });

  it('getSkillById returns undefined for a nonexistent id', () => {
    const item = getSkillById('no-existe');
    assert.strictEqual(item, undefined);
  });
});

describe('MCP catalog', () => {
  it('every item has a source link and non-empty description', () => {
    for (const item of mcpCatalog) {
      assert.ok(item.sourceUrl.startsWith('https://'), `${item.id} must have an https sourceUrl`);
      assert.ok(item.description.length > 0, `${item.id} must have a description`);
    }
  });

  it('filters by category', () => {
    const result = getMcpCatalog({ category: 'version-control' });
    assert.ok(result.items.length > 0);
    assert.ok(result.items.every((item) => item.category === 'version-control'));
  });

  it('filters by free-text query', () => {
    const result = getMcpCatalog({ q: 'github' });
    assert.ok(result.items.some((item) => item.id === 'github-mcp-server'));
  });

  it('getMcpById returns the correct item for a valid id', () => {
    const item = getMcpById('github-mcp-server');
    assert.ok(item);
    assert.strictEqual(item.category, 'version-control');
  });

  it('getMcpById returns undefined for a nonexistent id', () => {
    const item = getMcpById('no-existe');
    assert.strictEqual(item, undefined);
  });
});
