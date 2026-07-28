/**
 * Shared lookup/filter plumbing for the static Creator catalogs
 * (`catalog.ts`, `skillsCatalog.ts`, `mcpCatalog.ts`, `modelsCatalog.ts`).
 *
 * Every catalog is immutable per deploy and answers the same three questions:
 * lookup by id, return everything, or return a subset filtered by exact-match
 * facets plus a free-text query. Keeping that logic here avoids re-deriving the
 * `#407` hot-path contract (frozen, pre-computed no-filter response) in each
 * catalog module.
 */

/** Map a catalog by item id for O(1) lookups. */
export function indexById<TItem extends { id: string }>(items: readonly TItem[]): ReadonlyMap<string, TItem> {
  return new Map(items.map((item) => [item.id, item]));
}

/**
 * Case-insensitive substring filter. `query` is lowercased once; `valuesOf`
 * returns the fields an item is searchable by.
 */
export function filterByText<TItem>(
  items: readonly TItem[],
  query: string,
  valuesOf: (item: TItem) => readonly string[],
): TItem[] {
  const needle = query.toLowerCase();
  return items.filter((item) => valuesOf(item).some((value) => value.toLowerCase().includes(needle)));
}

export interface CatalogQueryConfig<TItem extends { id: string }, TFacet extends string> {
  version: string;
  items: TItem[];
  /**
   * Exact-match filters, keyed by the filter property name and mapping an item
   * to the value that property matches against. Applied in declaration order.
   */
  facets: { [K in TFacet]: (item: TItem) => string };
  /** Fields scanned by the free-text `q` filter. */
  searchFields: (item: TItem) => readonly string[];
}

export type CatalogFilter<TFacet extends string> = { [K in TFacet]?: string } & { q?: string };

export interface CatalogQuery<TItem, TFacet extends string> {
  getById(id: string): TItem | undefined;
  query(filter?: CatalogFilter<TFacet>): { version: string; items: TItem[] };
}

export function createCatalogQuery<TItem extends { id: string }, TFacet extends string>(
  config: CatalogQueryConfig<TItem, TFacet>,
): CatalogQuery<TItem, TFacet> {
  const { version, items, searchFields } = config;
  const index = indexById(items);
  const facets = Object.entries(config.facets) as Array<[TFacet, (item: TItem) => string]>;

  // #407: the no-filter response is immutable per deploy; serve a frozen
  // pre-computed instance instead of scanning on every request.
  const fullResponse = Object.freeze({ version, items });

  return {
    getById(id) {
      return index.get(id);
    },
    query(filter) {
      if (!filter || (!filter.q && facets.every(([facet]) => !filter[facet]))) {
        return fullResponse;
      }
      let result: TItem[] = items;
      for (const [facet, valueOf] of facets) {
        const expected = filter[facet];
        if (expected) result = result.filter((item) => valueOf(item) === expected);
      }
      if (filter.q) result = filterByText(result, filter.q, searchFields);
      return { version, items: result };
    },
  };
}
