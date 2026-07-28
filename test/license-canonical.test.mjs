import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

// Issue #713: GitHub's license detector (Licensee) compares LICENSE against the
// canonical license text. A custom preamble (copyright notice, contributors
// section) or a reflowed body drops the similarity below the detection
// threshold and `gh repo view --json licenseInfo` returns null. These tests
// pin the canonical shape so the regression cannot come back.

const ROOT = path.resolve(import.meta.dirname, '..');
const LICENSE = fs.readFileSync(path.join(ROOT, 'LICENSE'), 'utf8');

describe('LICENSE (MPL-2.0 canonical text)', () => {
  it('starts with the canonical MPL-2.0 heading, with no custom preamble', () => {
    assert.ok(
      LICENSE.startsWith('Mozilla Public License Version 2.0\n==================================\n'),
      'LICENSE must start with the canonical MPL-2.0 heading',
    );
  });

  it('has no project copyright notice outside the license text', () => {
    assert.ok(!/^Copyright \(c\)/m.test(LICENSE), 'the copyright notice belongs in NOTICE, not in LICENSE');
    assert.ok(!/^CONTRIBUTORS/m.test(LICENSE), 'the contributors list belongs in NOTICE, not in LICENSE');
  });

  it('keeps the canonical asterisk-boxed disclaimer and liability sections', () => {
    // These boxes are the part most often destroyed by reformatting tools.
    assert.match(LICENSE, /^\*{72}$/m);
    assert.match(LICENSE, /\*\s+6\. Disclaimer of Warranty\s+\*/);
    assert.match(LICENSE, /\*\s+7\. Limitation of Liability\s+\*/);
  });

  it('keeps the canonical Exhibit A and Exhibit B notices', () => {
    assert.match(LICENSE, /Exhibit A - Source Code Form License Notice\n-{43}\n/);
    assert.match(LICENSE, /Exhibit B - "Incompatible With Secondary Licenses" Notice\n-{57}\n/);
  });

  it('matches the canonical line count of the MPL-2.0 text', () => {
    assert.equal(LICENSE.split('\n').length - 1, 373);
  });

  it('is excluded from prettier so formatting cannot reflow it', () => {
    const ignore = fs.readFileSync(path.join(ROOT, '.prettierignore'), 'utf8');
    const entries = ignore
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    assert.ok(entries.includes('LICENSE'), '.prettierignore must list LICENSE');
  });
});

describe('NOTICE', () => {
  const noticePath = path.join(ROOT, 'NOTICE');

  it('exists and carries the project copyright notice', () => {
    assert.ok(fs.existsSync(noticePath), 'NOTICE must exist');
    const notice = fs.readFileSync(noticePath, 'utf8');
    assert.match(notice, /Copyright \(c\) 2026 Artemisa and its contributors/);
    assert.match(notice, /Mozilla Public\nLicense, v\. 2\.0/);
    assert.match(notice, /contributors/i);
  });

  it('is referenced from both READMEs alongside the LICENSE link', () => {
    for (const file of ['README.md', 'README.en.md']) {
      const readme = fs.readFileSync(path.join(ROOT, file), 'utf8');
      assert.match(readme, /\(NOTICE\)/, `${file} must link to NOTICE`);
      assert.match(readme, /\(LICENSE\)/, `${file} must link to LICENSE`);
      assert.match(readme, /MPL-2\.0|MPL--2\.0/, `${file} must keep the MPL-2.0 badge/mention`);
    }
  });
});
