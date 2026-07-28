'use client';

import { creator } from '@/lib/api';
import { useTranslations } from '@/i18n';
import type { SkillCatalogItem } from '@artemisa/types';
import { CatalogBrowser, CatalogSourceLink } from './catalog-browser';

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

const loadSkills = () => creator.getSkills();
const skillFocusOf = (item: SkillCatalogItem) => item.focus;

/**
 * Searchable, filterable catalog of real agent skills (curated from
 * awesome-skills, see src/creator/skillsCatalog.ts). Used in fine-tuning mode
 * and behind the "Personalizado" skills_focus option in automated mode.
 */
export function SkillsBrowser({ selected, onChange, initialFocus, allowedIds }: SkillsBrowserProps) {
  const t = useTranslations('creator');

  return (
    <CatalogBrowser<SkillCatalogItem>
      selected={selected}
      onChange={onChange}
      allowedIds={allowedIds}
      load={loadSkills}
      facetOf={skillFocusOf}
      initialFacet={initialFocus && initialFocus !== 'custom' ? initialFocus : ''}
      facetLabel={(value) =>
        (t.skills.focusLabels[value as keyof typeof t.skills.focusLabels] as string | undefined) ?? value
      }
      labels={{
        searchPlaceholder: t.skills.searchPlaceholder,
        searchAriaLabel: t.skills.searchAriaLabel,
        all: t.skills.all,
        loading: t.skills.loading,
        noResults: t.skills.noResults,
      }}
      renderMeta={(item) => (
        <CatalogSourceLink href={item.sourceUrl} label={t.skills.source.replace('{sourceName}', item.sourceName)} />
      )}
    />
  );
}
