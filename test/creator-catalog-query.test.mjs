import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCatalogQuery, filterByText, indexById } from '../src/creator/catalogQuery.ts';

const items = [
  { id: 'alpha', name: 'Alpha', description: 'Primer elemento', category: 'dev', tier: 'frontier', tags: ['One'] },
  { id: 'beta', name: 'Beta', description: 'Segundo ALPHA elemento', category: 'ops', tier: 'mid', tags: ['two'] },
  { id: 'gamma', name: 'Gamma', description: 'Tercer elemento', category: 'dev', tier: 'mid', tags: ['three'] },
];

const catalog = createCatalogQuery({
  version: '9.9.9',
  items,
  facets: { category: (item) => item.category, tier: (item) => item.tier },
  searchFields: (item) => [item.name, item.description, ...item.tags],
});

describe('catalogQuery', () => {
  it('indexes items by id', () => {
    const index = indexById(items);
    assert.equal(index.get('beta').name, 'Beta');
    assert.equal(index.get('nope'), undefined);
  });

  it('filterByText matches any searchable field case-insensitively', () => {
    const result = filterByText(items, 'ONE', (item) => [item.name, item.description, ...item.tags]);
    assert.deepEqual(
      result.map((item) => item.id),
      ['alpha'],
    );
  });

  it('returns the same frozen instance when no filter is applied', () => {
    const first = catalog.query();
    assert.equal(first, catalog.query({}));
    assert.ok(Object.isFrozen(first));
    assert.equal(first.version, '9.9.9');
    assert.equal(first.items.length, 3);
  });

  it('applies facet filters and the free-text query together', () => {
    assert.deepEqual(
      catalog.query({ category: 'dev' }).items.map((item) => item.id),
      ['alpha', 'gamma'],
    );
    assert.deepEqual(
      catalog.query({ category: 'dev', tier: 'mid' }).items.map((item) => item.id),
      ['gamma'],
    );
    assert.deepEqual(
      catalog.query({ q: 'alpha' }).items.map((item) => item.id),
      ['alpha', 'beta'],
    );
    assert.deepEqual(
      catalog.query({ category: 'ops', q: 'alpha' }).items.map((item) => item.id),
      ['beta'],
    );
    assert.deepEqual(catalog.query({ q: 'inexistente' }).items, []);
  });

  it('looks up single items by id', () => {
    assert.equal(catalog.getById('gamma').name, 'Gamma');
    assert.equal(catalog.getById('delta'), undefined);
  });
});
