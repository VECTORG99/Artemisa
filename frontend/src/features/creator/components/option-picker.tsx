'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuCheck, LuPlus, LuSearch, LuTriangleAlert, LuX } from 'react-icons/lu';
import { TechIcon } from '@/features/creator/lib/tech-icons';
import { glassFilterChip, glassInput, glassOptionCard, glassPill } from '@/lib/glass';
import { slugify } from '@/lib/utils';

export interface PickerOption {
  id: string;
  label: string;
  description?: string;
  /** Catalog category, used to pick a fallback icon. */
  category?: string;
  tags?: string[];
}

interface OptionPickerProps {
  options: PickerOption[];
  multiple: boolean;
  value: string | string[];
  onChange: (next: string | string[]) => void;
  /** Backend `maxSelections`. Enforced client-side so /evaluate never rejects. */
  max?: number;
  /** Render a search field once the list exceeds this many options. */
  searchThreshold?: number;
  /** Enables the `custom:<slug>` escape hatch every catalog question accepts. */
  allowCustom?: boolean;
  ariaLabel: string;
  /** Tailwind max-height for the scroll area. */
  maxHeightClass?: string;
  columnsClass?: string;
  showIcons?: boolean;
}

/**
 * The single option grid used by both the guided wizard and the advanced
 * dashboard: search, selected chips, `maxSelections` enforcement, `custom:`
 * entries, brand icons and a glass scrollbar.
 *
 * It exists because the two modes previously had separate implementations —
 * the wizard's had no search and no max, so a question like `technologies`
 * (200+ catalog items, max 24) was unusable there and could build a payload
 * the backend rejects.
 */
export function OptionPicker({
  options,
  multiple,
  value,
  onChange,
  max,
  searchThreshold = 12,
  allowCustom = false,
  ariaLabel,
  maxHeightClass = 'max-h-[46vh]',
  columnsClass = 'sm:grid-cols-2',
  showIcons = true,
}: OptionPickerProps) {
  const [query, setQuery] = useState('');
  const [customDraft, setCustomDraft] = useState('');
  const [customOpen, setCustomOpen] = useState(false);
  const [atEnd, setAtEnd] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selected = useMemo<string[]>(
    () => (multiple ? (Array.isArray(value) ? value : []) : typeof value === 'string' && value ? [value] : []),
    [multiple, value],
  );

  const limit = max ?? Number.POSITIVE_INFINITY;
  const atMax = multiple && selected.length >= limit;

  /**
   * Values chosen earlier that are not in `options` (a `custom:` entry, or a
   * catalog id from a previous catalog version) still need a chip, otherwise
   * they would look lost while remaining in the payload.
   */
  const allOptions = useMemo<PickerOption[]>(() => {
    const known = new Set(options.map((option) => option.id));
    const extras = selected
      .filter((id) => !known.has(id))
      .map<PickerOption>((id) => ({
        id,
        label: id.startsWith('custom:') ? `Personalizado: ${id.slice(7).replace(/[-_]+/g, ' ')}` : id,
        description: id.startsWith('custom:') ? 'Opción personalizada — requiere un adaptador manual.' : undefined,
      }));
    return [...options, ...extras];
  }, [options, selected]);

  const normalized = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!normalized) return allOptions;
    return allOptions.filter(
      (option) =>
        option.label.toLowerCase().includes(normalized) ||
        option.id.toLowerCase().includes(normalized) ||
        (option.description ?? '').toLowerCase().includes(normalized) ||
        (option.tags ?? []).some((tag) => tag.toLowerCase().includes(normalized)),
    );
  }, [allOptions, normalized]);

  const toggle = useCallback(
    (id: string) => {
      if (!multiple) {
        onChange(id);
        return;
      }
      if (selected.includes(id)) {
        onChange(selected.filter((item) => item !== id));
        return;
      }
      if (selected.length >= limit) return;
      onChange([...selected, id]);
    },
    [multiple, onChange, selected, limit],
  );

  // Drives the bottom fade: it must disappear at the end of the list so the
  // last option is never rendered dimmed.
  const syncScrollEdge = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    setAtEnd(node.scrollHeight - node.scrollTop - node.clientHeight < 12);
  }, []);

  useEffect(() => {
    syncScrollEdge();
  }, [filtered.length, syncScrollEdge]);

  function addCustom() {
    const slug = slugify(customDraft);
    if (!slug) return;
    const id = `custom:${slug}`;
    if (multiple) {
      if (selected.includes(id) || selected.length >= limit) return;
      onChange([...selected, id]);
    } else {
      onChange(id);
    }
    setCustomDraft('');
    setCustomOpen(false);
  }

  const showSearch = allOptions.length > searchThreshold;

  return (
    <div className="flex flex-col gap-3">
      {showSearch && (
        <div className="relative">
          <LuSearch
            className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Buscar entre ${allOptions.length} opciones…`}
            aria-label={`Buscar en ${ariaLabel}`}
            className={glassInput('py-2.5 pl-9 text-sm')}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-500 transition-colors hover:text-white"
            >
              <LuX className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {multiple && selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((id) => {
            const option = allOptions.find((candidate) => candidate.id === id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggle(id)}
                className={glassFilterChip(true, 'text-[11px]')}
                aria-label={`Quitar ${option?.label ?? id}`}
              >
                {option?.label ?? id}
                <LuX className="h-3 w-3 text-zinc-400" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={syncScrollEdge}
        data-at-end={atEnd}
        role={multiple ? 'group' : 'radiogroup'}
        aria-label={ariaLabel}
        className={`creator-scroll scroll-fade-bottom grid gap-2.5 overflow-y-auto pr-1 ${maxHeightClass} ${columnsClass}`}
      >
        {filtered.map((option, index) => {
          const isSelected = selected.includes(option.id);
          const blocked = multiple && !isSelected && atMax;
          return (
            <button
              key={option.id}
              type="button"
              role={multiple ? 'checkbox' : 'radio'}
              aria-checked={isSelected}
              disabled={blocked}
              onClick={() => toggle(option.id)}
              className={glassOptionCard(isSelected, blocked)}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  {showIcons && (
                    <TechIcon id={option.id} category={option.category} className="h-4 w-4 shrink-0 text-zinc-400" />
                  )}
                  <span className="truncate text-sm font-medium text-zinc-100">{option.label}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {isSelected && <LuCheck className="h-3.5 w-3.5 text-white" aria-hidden="true" />}
                </span>
              </span>
              {option.description && (
                <span className="line-clamp-2 text-xs leading-relaxed text-zinc-500">{option.description}</span>
              )}
            </button>
          );
        })}

        {filtered.length === 0 && (
          <p className="col-span-full py-6 text-center text-sm text-zinc-500">
            {allOptions.length === 0
              ? 'El catálogo no tiene opciones para esta categoría.'
              : `Sin resultados para «${query}».`}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {multiple && max !== undefined && (
          <span className={`text-[11px] tabular-nums ${atMax ? 'text-warn' : 'text-zinc-600'}`}>
            {selected.length} / {max} seleccionadas
          </span>
        )}

        {allowCustom && (
          <div className="ml-auto flex items-center gap-2">
            {customOpen ? (
              <>
                <input
                  type="text"
                  value={customDraft}
                  autoFocus
                  onChange={(event) => setCustomDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addCustom();
                    }
                    if (event.key === 'Escape') setCustomOpen(false);
                  }}
                  placeholder="Nombre de la tecnología"
                  aria-label="Nombre de la opción personalizada"
                  className={glassInput('w-56 py-1.5 text-xs')}
                />
                <button
                  type="button"
                  onClick={addCustom}
                  disabled={!slugify(customDraft) || atMax}
                  className={glassFilterChip(false, 'text-[11px] disabled:cursor-not-allowed disabled:opacity-40')}
                >
                  Añadir
                </button>
                <button
                  type="button"
                  onClick={() => setCustomOpen(false)}
                  aria-label="Cancelar opción personalizada"
                  className="rounded-full p-1 text-zinc-500 transition-colors hover:text-white"
                >
                  <LuX className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setCustomOpen(true)}
                disabled={atMax}
                className={glassPill(
                  'cursor-pointer text-[11px] text-zinc-400 transition-colors hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40',
                )}
              >
                <LuPlus className="h-3 w-3" aria-hidden="true" />
                No está en la lista
              </button>
            )}
          </div>
        )}
      </div>

      {atMax && (
        <p className="flex items-center gap-1.5 text-[11px] text-warn">
          <LuTriangleAlert className="h-3 w-3 shrink-0" aria-hidden="true" />
          Máximo de {max} alcanzado. Quita una opción para elegir otra.
        </p>
      )}

      {allowCustom && selected.some((id) => id.startsWith('custom:')) && (
        <p className="text-[11px] leading-relaxed text-zinc-600">
          Las opciones personalizadas se conservan en el blueprint y en <code>WHY.md</code>, y generan una advertencia
          de adaptador pendiente.
        </p>
      )}
    </div>
  );
}
