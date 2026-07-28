import fs from 'node:fs';
import path from 'node:path';

// Build marker for the deployed bundle. Order matters: the CI/host-provided
// commit SHA wins, so `GET /sw-version.js` on a deployment tells you exactly
// which commit is live (issue #710). `COMMIT_REF` is Netlify's variable —
// without it the marker fell back to a timestamp and production could not be
// compared against master.
const version =
  process.env.COMMIT_REF ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  process.env.COMMIT_SHA ||
  `${process.env.npm_package_version || 'dev'}-${Date.now()}`;

const normalized = version.replace(/[^a-zA-Z0-9._-]/g, '-');
const target = path.resolve('public', 'sw-version.js');

fs.writeFileSync(target, `self.ARTEMISA_SW_VERSION = ${JSON.stringify(normalized)};\n`);
