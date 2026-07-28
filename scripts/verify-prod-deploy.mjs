#!/usr/bin/env node
/**
 * Verifies that the deployed frontend serves the same commit as a Git ref.
 *
 * Issue #710: production served a bundle older than `master` and nobody
 * noticed, because there was no way to ask the site which commit it was
 * running. The frontend build writes a marker to `public/sw-version.js`
 * (`frontend/scripts/write-sw-version.mjs`) using the host-provided commit SHA
 * (`COMMIT_REF` on Netlify), so the check is a string comparison.
 *
 * Usage:
 *   node scripts/verify-prod-deploy.mjs                       # vs origin/master
 *   node scripts/verify-prod-deploy.mjs --ref origin/development
 *   node scripts/verify-prod-deploy.mjs --url https://staging.example.com
 *
 * Exit codes: 0 match, 1 mismatch or unreachable, 2 bad usage.
 */

import { execFileSync } from 'node:child_process';

export const DEFAULT_SITE = 'https://artemisa-ai.netlify.app';

/** Extracts the marker written by write-sw-version.mjs. */
export function parseSwVersion(source) {
  const match = /self\.ARTEMISA_SW_VERSION\s*=\s*"([^"]+)"/.exec(source ?? '');
  return match ? match[1] : null;
}

/**
 * A marker is a commit only when it looks like a Git SHA. Anything else means
 * the build ran without a commit env var (the local fallback is
 * `<pkgVersion>-<timestamp>`), so the deployment cannot be verified.
 */
export function isCommitMarker(marker) {
  return typeof marker === 'string' && /^[0-9a-f]{7,40}$/i.test(marker);
}

/** true when the deployed marker and the local commit are the same commit. */
export function markerMatchesCommit(marker, commit) {
  if (!isCommitMarker(marker) || !isCommitMarker(commit)) return false;
  const [short, long] = marker.length <= commit.length ? [marker, commit] : [commit, marker];
  return long.toLowerCase().startsWith(short.toLowerCase());
}

export function parseArgs(argv) {
  const options = { url: DEFAULT_SITE, ref: 'origin/master' };
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (!value) throw new Error(`missing value for ${flag}`);
    if (flag === '--url') options.url = value.replace(/\/$/, '');
    else if (flag === '--ref') options.ref = value;
    else throw new Error(`unknown option ${flag}`);
  }
  return options;
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`usage error: ${error.message}`);
    process.exit(2);
  }

  const commit = execFileSync('git', ['rev-parse', options.ref], { encoding: 'utf8' }).trim();

  const url = `${options.url}/sw-version.js?cachebust=${Date.now()}`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    console.error(`✗ ${url} returned ${response.status}`);
    process.exit(1);
  }
  const marker = parseSwVersion(await response.text());

  if (!isCommitMarker(marker)) {
    console.error(
      `✗ deployed marker is "${marker}", not a commit SHA.\n` +
        '  The host built without a commit env var (Netlify: COMMIT_REF). ' +
        'Trigger a fresh deploy from the connected branch and re-check.',
    );
    process.exit(1);
  }

  if (!markerMatchesCommit(marker, commit)) {
    console.error(
      `✗ production is on ${marker}, ${options.ref} is ${commit.slice(0, 12)}.\n` +
        '  Production does not match the branch: check the host build log ' +
        '(queued, failed, or the site is connected to another branch) and redeploy.',
    );
    process.exit(1);
  }

  console.log(`✓ production matches ${options.ref} (${marker})`);
}

// Only run as a CLI; the helpers above are imported by the tests.
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  await main();
}
