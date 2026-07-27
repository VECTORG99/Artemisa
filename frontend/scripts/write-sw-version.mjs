import fs from 'node:fs';
import path from 'node:path';

const version =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  process.env.COMMIT_SHA ||
  `${process.env.npm_package_version || 'dev'}-${Date.now()}`;

const normalized = version.replace(/[^a-zA-Z0-9._-]/g, '-');
const target = path.resolve('public', 'sw-version.js');

fs.writeFileSync(target, `self.ARTEMISA_SW_VERSION = ${JSON.stringify(normalized)};\n`);
