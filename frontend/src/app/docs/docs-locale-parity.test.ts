import { describe, expect, it } from 'vitest';

import en from '@/i18n/messages/en.json';
import es from '@/i18n/messages/es.json';

// Issue #735: the docs sidebar is built from `docs.sections` of the active
// locale. `en.json` only declared 1 of the 4 sections and 3 of the 15
// documents, so switching the language from the docs page made most of the
// documentation disappear. The structure (section ids and doc paths) must be
// identical across locales; only the visible strings are translated.

type Section = { id: string; title: string; docs: Array<{ path: string; label: string }> };

const esSections = es.docs.sections as Section[];
const enSections = en.docs.sections as Section[];

describe('docs sidebar locale parity', () => {
  it('declares the same sections in the same order', () => {
    expect(enSections.map((section) => section.id)).toEqual(esSections.map((section) => section.id));
  });

  it('declares the same document paths in every section', () => {
    for (const [index, section] of esSections.entries()) {
      expect(
        enSections[index]?.docs.map((doc) => doc.path),
        section.id,
      ).toEqual(section.docs.map((doc) => doc.path));
    }
  });

  it('exposes the full documentation set in both locales', () => {
    const count = (sections: Section[]) => sections.reduce((total, section) => total + section.docs.length, 0);
    expect(count(enSections)).toBe(count(esSections));
    expect(count(enSections)).toBeGreaterThanOrEqual(15);
  });

  it('translates every section title and document label', () => {
    for (const section of enSections) {
      expect(section.title.trim().length, section.id).toBeGreaterThan(0);
      for (const doc of section.docs) {
        expect(doc.label.trim().length, doc.path).toBeGreaterThan(0);
      }
    }
  });

  it('keeps the docs page strings present in both locales', () => {
    for (const key of ['title', 'back', 'selectDocument', 'loading', 'fetchError', 'loadError', 'viewOnGitHub']) {
      expect(en.docs, `en.docs.${key}`).toHaveProperty(key);
      expect(es.docs, `es.docs.${key}`).toHaveProperty(key);
    }
  });
});
