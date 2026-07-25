'use client';

import { useEffect, useMemo, useState } from 'react';
import { creator } from '@/lib/api';
import { glassCard, glassInput, glassPill } from '@/lib/glass';
import type { SkillCatalogItem } from '@huascar/types';

const FOCUS_LABELS: Record<string, string> = {
  development: 'Desarrollo',
  security: 'Seguridad',
  'data-ai': 'Datos e IA',
  operations: 'Operaciones',
  documentation: 'Documentación',
};

interface SkillsBrowserProps {
  /** Currently selected skill ids. */
  selected: string[];
  onChange: (next: string[]) => void;
  /** Preselect this focus filter on mount (from the skills_focus answer). */
  initialFocus?: string;
}

/**
 * Searchable, filterable catalog of real agent skills (curated from
 * awesome-skills, see src/creator/skillsCatalog.ts). Used in fine-tuning mode
 * and behind the "Personalizado" skills_focus option in automated mode.
 */
export function SkillsBrowser({ selected, onChange, initialFocus }: SkillsBrowserProps) {
  const [items, setItems] = useState<SkillCatalogItem[]>([]);
  const [query, setQuery] = useState('');
  const [focus, setFocus] = useState(initialFocus && initialFocus !== 'custom' ? initialFocus : '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    creator
      .getSkills()
      .then((res) => setItems(res.items))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (focus && item.focus !== focus) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [items, focus, query]);

  const focusOptions = useMemo(() => [...new Set(items.map((item) => item.focus))], [items]);

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar skills por nombre, descripción o tag..."
          className={glassInput('flex-1')}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFocus('')}
          className={glassPill(
            `cursor-pointer transition-colors ${focus === '' ? 'border-white/30 bg-white/[0.1] text-white' : 'hover:border-white/20'}`,
          )}
        >
          Todas
        </button>
        {focusOptions.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFocus(option)}
            className={glassPill(
              `cursor-pointer transition-colors ${focus === option ? 'border-white/30 bg-white/[0.1] text-white' : 'hover:border-white/20'}`,
            )}
          >
            {FOCUS_LABELS[option] ?? option}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-zinc-500">Cargando catálogo de skills...</p>}
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
                  {isSelected && <span className="text-xs text-emerald-300">Seleccionada</span>}
                </div>
                <p className="text-sm text-zinc-400">{item.description}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className={glassPill('text-[10px] uppercase tracking-wide text-zinc-500')}>
                    {FOCUS_LABELS[item.focus] ?? item.focus}
                  </span>
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
                  >
                    Ver fuente ({item.sourceName})
                  </a>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="col-span-2 text-sm text-zinc-500">Ninguna skill coincide con esa búsqueda.</p>
          )}
        </div>
      )}
    </div>
  );
}
