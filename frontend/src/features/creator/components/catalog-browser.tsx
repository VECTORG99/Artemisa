'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { LuCheck, LuCircleAlert, LuLoaderCircle, LuSearch } from 'react-icons/lu';
import { glassFilterChip, glassInput, glassNotice, glassOptionCard, glassPill } from '@/lib/glass';

/** Shape shared by the skills and MCP catalog endpoints. */
export interface CatalogBrowserItem {
  id: string;
  name: string;
  description: string;
  tags: string[];
}

export interface CatalogBrowserLabels {
  searchPlaceholder: string;
  searchAriaLabel: string;
  all: string;
  loading: string;
  noResults: string;
}

export interface CatalogBrowserProps<TItem extends CatalogBrowserItem> {
  /** Currently selected catalog ids. */
  selected: string[];
  onChange: (next: string[]) => void;
  /**
   * Restricts the list to these ids. The skills/mcps endpoints are broader than
   * the catalog categories the decision tree validates their answers against,
   * so callers that must produce a valid answer pass the accepted catalog ids
   * here. Omit to show the full endpoint catalog.
   */
  allowedIds?: string[];
  /** Loads the catalog on mount; must be referentially stable. */
  load: () => Promise<{ items: TItem[] }>;
  /** Value the chip filter groups items by (skills focus, MCP category). */
  facetOf: (item: TItem) => string;
  /** Chip preselected on mount. */
  initialFacet?: string;
  facetLabel: (value: string) => string;
  labels: CatalogBrowserLabels;
  /** Extra pills/links rendered after the facet pill of each card. */
  renderMeta: (item: TItem) => ReactNode;
}

/**
 * Searchable, filterable grid over one of the Creator's static catalogs. Used
 * in fine-tuning mode (and behind the "Personalizado" skills_focus option) to
 * hand-pick which skills or MCP tools the generated agent gets.
 */
export function CatalogBrowser<TItem extends CatalogBrowserItem>({
  selected,
  onChange,
  allowedIds,
  load,
  facetOf,
  initialFacet,
  facetLabel,
  labels,
  renderMeta,
}: CatalogBrowserProps<TItem>) {
  const [items, setItems] = useState<TItem[]>([]);
  const [query, setQuery] = useState('');
  const [facet, setFacet] = useState(initialFacet ?? '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    load()
      .then((res) => setItems(res.items))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [load]);

  const scoped = useMemo(() => {
    if (!allowedIds) return items;
    const allowed = new Set(allowedIds);
    return items.filter((item) => allowed.has(item.id));
  }, [items, allowedIds]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return scoped.filter((item) => {
      if (facet && facetOf(item) !== facet) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [scoped, facet, query, facetOf]);

  const facetOptions = useMemo(() => [...new Set(scoped.map(facetOf))], [scoped, facetOf]);

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <LuSearch
          className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500"
          aria-hidden="true"
        />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={labels.searchPlaceholder}
          aria-label={labels.searchAriaLabel}
          className={glassInput('py-2.5 pl-9 text-sm')}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setFacet('')} className={glassFilterChip(facet === '')}>
          {labels.all}
        </button>
        {facetOptions.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFacet(option)}
            className={glassFilterChip(facet === option)}
          >
            {facetLabel(option)}
          </button>
        ))}
      </div>

      {loading && (
        <p className="flex items-center gap-2 text-sm text-zinc-500">
          <LuLoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          {labels.loading}
        </p>
      )}
      {error && (
        <p className={glassNotice('danger')} role="alert">
          <LuCircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}

      {!loading && !error && (
        <div className="creator-scroll grid max-h-[42vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          {filtered.map((item) => {
            const isSelected = selected.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                role="checkbox"
                aria-checked={isSelected}
                onClick={() => toggle(item.id)}
                className={glassOptionCard(isSelected, false, 'gap-2 p-4')}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-zinc-100">{item.name}</span>
                  {isSelected && <LuCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white" aria-hidden="true" />}
                </div>
                <p className="text-xs leading-relaxed text-zinc-400">{item.description}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className={glassPill('py-0.5 text-[10px] uppercase tracking-wide text-zinc-500')}>
                    {facetLabel(facetOf(item))}
                  </span>
                  {renderMeta(item)}
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && <p className="col-span-full py-4 text-sm text-zinc-500">{labels.noResults}</p>}
        </div>
      )}
    </div>
  );
}

/** Link to a catalog item's upstream source, rendered inside a card. */
export function CatalogSourceLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
      className="text-[11px] text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
    >
      {label}
    </a>
  );
}
