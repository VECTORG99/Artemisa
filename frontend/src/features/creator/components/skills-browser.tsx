'use client';

import { useEffect, useMemo, useState } from 'react';
import { LuCheck, LuCircleAlert, LuLoaderCircle, LuSearch } from 'react-icons/lu';
import { creator } from '@/lib/api';
import { glassFilterChip, glassInput, glassNotice, glassOptionCard, glassPill } from '@/lib/glass';
import type { SkillCatalogItem } from '@artemisa/types';

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
  /**
   * Restricts the list to these ids. The skills endpoint is broader than the
   * `skill` catalog category the decision tree validates `skills_selection`
   * against, so callers that must produce a valid answer pass the accepted
   * catalog ids here. Omit to show the full endpoint catalog.
   */
  allowedIds?: string[];
}

/**
 * Searchable, filterable catalog of real agent skills (curated from
 * awesome-skills, see src/creator/skillsCatalog.ts). Used in fine-tuning mode
 * and behind the "Personalizado" skills_focus option in automated mode.
 */
export function SkillsBrowser({ selected, onChange, initialFocus, allowedIds }: SkillsBrowserProps) {
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
    const allowed = allowedIds ? new Set(allowedIds) : null;
    return items.filter((item) => {
      if (allowed && !allowed.has(item.id)) return false;
      if (focus && item.focus !== focus) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [items, focus, query, allowedIds]);

  const focusOptions = useMemo(() => {
    const allowed = allowedIds ? new Set(allowedIds) : null;
    const scoped = allowed ? items.filter((item) => allowed.has(item.id)) : items;
    return [...new Set(scoped.map((item) => item.focus))];
  }, [items, allowedIds]);

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
          placeholder="Buscar skills por nombre, descripción o tag…"
          aria-label="Buscar skills"
          className={glassInput('py-2.5 pl-9 text-sm')}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setFocus('')} className={glassFilterChip(focus === '')}>
          Todas
        </button>
        {focusOptions.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFocus(option)}
            className={glassFilterChip(focus === option)}
          >
            {FOCUS_LABELS[option] ?? option}
          </button>
        ))}
      </div>

      {loading && (
        <p className="flex items-center gap-2 text-sm text-zinc-500">
          <LuLoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Cargando catálogo de skills…
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
                    {FOCUS_LABELS[item.focus] ?? item.focus}
                  </span>
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    className="text-[11px] text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
                  >
                    Ver fuente ({item.sourceName})
                  </a>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="col-span-full py-4 text-sm text-zinc-500">Ninguna skill coincide con esa búsqueda.</p>
          )}
        </div>
      )}
    </div>
  );
}
