'use client';

import { useEffect, useMemo, useState } from 'react';
import { creator } from '@/lib/api';
import { glassCard, glassInput, glassPill } from '@/lib/glass';
import type { McpCatalogItem } from '@huascar/types';

const CATEGORY_LABELS: Record<string, string> = {
  development: 'Desarrollo',
  productivity: 'Productividad',
  database: 'Base de datos',
  search: 'Búsqueda',
  'web-scraping': 'Web scraping',
  'file-system': 'Sistema de archivos',
  'version-control': 'Control de versiones',
  communication: 'Comunicación',
  'cloud-service': 'Servicio en la nube',
};

interface McpBrowserProps {
  selected: string[];
  onChange: (next: string[]) => void;
}

/**
 * Searchable, filterable catalog of real MCP servers (curated from
 * mcpservers.org, see src/creator/mcpCatalog.ts). Used in fine-tuning mode
 * to hand-pick which MCP tools the generated agent gets.
 */
export function McpBrowser({ selected, onChange }: McpBrowserProps) {
  const [items, setItems] = useState<McpCatalogItem[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    creator
      .getMcps()
      .then((res) => setItems(res.items))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (category && item.category !== category) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [items, category, query]);

  const categoryOptions = useMemo(() => [...new Set(items.map((item) => item.category))], [items]);

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar servidores MCP por nombre, descripción o tag..."
        className={glassInput()}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategory('')}
          className={glassPill(
            `cursor-pointer transition-colors ${category === '' ? 'border-white/30 bg-white/[0.1] text-white' : 'hover:border-white/20'}`,
          )}
        >
          Todas
        </button>
        {categoryOptions.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setCategory(option)}
            className={glassPill(
              `cursor-pointer transition-colors ${category === option ? 'border-white/30 bg-white/[0.1] text-white' : 'hover:border-white/20'}`,
            )}
          >
            {CATEGORY_LABELS[option] ?? option}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-zinc-500">Cargando catálogo de MCPs...</p>}
      {error && <p className="text-sm text-red-300">{error}</p>}

      {!loading && !error && (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((item) => {
            const isSelected = selected.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggle(item.id)}
                className={glassCard(
                  `flex flex-col gap-2 p-4 text-left transition-colors ${isSelected ? 'border-white/30 bg-white/[0.06]' : 'hover:border-white/15 hover:bg-white/[0.04]'}`,
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-zinc-100">{item.name}</span>
                  {isSelected && <span className="text-xs text-emerald-300">Seleccionado</span>}
                </div>
                <p className="text-sm text-zinc-400">{item.description}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className={glassPill('text-[10px] uppercase tracking-wide text-zinc-500')}>
                    {CATEGORY_LABELS[item.category] ?? item.category}
                  </span>
                  {item.official && (
                    <span className={glassPill('text-[10px] uppercase tracking-wide text-emerald-300')}>Oficial</span>
                  )}
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
                  >
                    Ver fuente
                  </a>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="col-span-2 text-sm text-zinc-500">Ningún servidor MCP coincide con esa búsqueda.</p>
          )}
        </div>
      )}
    </div>
  );
}
