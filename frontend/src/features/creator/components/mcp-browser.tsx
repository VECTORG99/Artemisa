'use client';

import { creator } from '@/lib/api';
import { glassPill } from '@/lib/glass';
import { useTranslations } from '@/i18n';
import type { McpCatalogItem } from '@artemisa/types';
import { CatalogBrowser, CatalogSourceLink } from './catalog-browser';

interface McpBrowserProps {
  selected: string[];
  onChange: (next: string[]) => void;
  /**
   * Restricts the list to these ids. The mcps endpoint is broader than the
   * `mcp` catalog category the decision tree validates `mcps_selection`
   * against, so callers that must produce a valid answer pass the accepted
   * catalog ids here. Omit to show the full endpoint catalog.
   */
  allowedIds?: string[];
}

const loadMcps = () => creator.getMcps();
const mcpCategoryOf = (item: McpCatalogItem) => item.category;

/**
 * Searchable, filterable catalog of real MCP servers (curated from
 * mcpservers.org, see src/creator/mcpCatalog.ts). Used in fine-tuning mode
 * to hand-pick which MCP tools the generated agent gets.
 */
export function McpBrowser({ selected, onChange, allowedIds }: McpBrowserProps) {
  const t = useTranslations('creator');

  return (
    <CatalogBrowser<McpCatalogItem>
      selected={selected}
      onChange={onChange}
      allowedIds={allowedIds}
      load={loadMcps}
      facetOf={mcpCategoryOf}
      facetLabel={(value) =>
        (t.mcps.categoryLabels[value as keyof typeof t.mcps.categoryLabels] as string | undefined) ?? value
      }
      labels={{
        searchPlaceholder: t.mcps.searchPlaceholder,
        searchAriaLabel: t.mcps.searchAriaLabel,
        all: t.mcps.all,
        loading: t.mcps.loading,
        noResults: t.mcps.noResults,
      }}
      renderMeta={(item) => (
        <>
          {item.official && (
            <span className={glassPill('py-0.5 text-[10px] uppercase tracking-wide text-zinc-300')}>
              {t.mcps.official}
            </span>
          )}
          <CatalogSourceLink href={item.sourceUrl} label={t.mcps.source} />
        </>
      )}
    />
  );
}
