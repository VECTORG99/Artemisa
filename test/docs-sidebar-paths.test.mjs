import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { listDocumentationFiles } from '../src/creator/docs-catalog.js';

// Issue #735: the docs page sidebar is a hand-written list in the i18n files,
// and the backend serves those paths through `/api/v1/creator/docs/content`.
// A path that does not exist renders an error panel instead of a document, and
// a locale that lists fewer documents hides them entirely.

const ROOT = path.resolve(import.meta.dirname, '..');

function sidebarSections(locale) {
  const messages = JSON.parse(fs.readFileSync(path.join(ROOT, `frontend/src/i18n/messages/${locale}.json`), 'utf8'));
  return messages.docs.sections;
}

function sidebarPaths(locale) {
  return sidebarSections(locale).flatMap((section) => section.docs.map((doc) => doc.path));
}

describe('docs sidebar paths (issue #735)', () => {
  it('every listed document exists on disk', () => {
    for (const docPath of sidebarPaths('es')) {
      assert.ok(fs.existsSync(path.join(ROOT, docPath)), `${docPath} does not exist`);
    }
  });

  it('both locales list the same documents', () => {
    assert.deepEqual(sidebarPaths('en'), sidebarPaths('es'));
  });

  it('both locales declare the same sections in the same order', () => {
    assert.deepEqual(
      sidebarSections('en').map((section) => section.id),
      sidebarSections('es').map((section) => section.id),
    );
  });

  it('every listed document is served by the docs catalog', () => {
    const served = new Set(listDocumentationFiles(ROOT).map((entry) => entry.path));
    for (const docPath of sidebarPaths('es')) {
      assert.ok(served.has(docPath), `${docPath} is not exposed by listDocumentationFiles`);
    }
  });
});
