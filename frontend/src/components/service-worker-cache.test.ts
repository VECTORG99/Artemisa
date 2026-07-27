import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const serviceWorker = fs.readFileSync('public/sw.js', 'utf8');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8')) as {
  scripts?: Record<string, string>;
};

describe('service worker cache strategy (#569)', () => {
  it('uses a generated build version for cache names', () => {
    expect(serviceWorker).toContain("importScripts('/sw-version.js')");
    expect(serviceWorker).toContain('self.HUASCAR_SW_VERSION');
    expect(serviceWorker).not.toContain("const CACHE = 'huascar-v1'");
    expect(packageJson.scripts?.prebuild).toBe('node ./scripts/write-sw-version.mjs');
  });

  it('serves navigations network-first with cache fallback', () => {
    const navigationBranch = serviceWorker.match(/if \(req\.mode === 'navigate'\) \{[\s\S]*?\n      \}/)?.[0] || '';

    expect(navigationBranch).toContain('const fresh = await fetch(req)');
    expect(navigationBranch).toContain('return fresh');
    expect(navigationBranch).toContain('await cache.match(req)');
    expect(navigationBranch).not.toContain('return cached || network');
  });

  it('waits for the page to request activation before skipWaiting', () => {
    const installBlock = serviceWorker.slice(
      serviceWorker.indexOf("self.addEventListener('install'"),
      serviceWorker.indexOf("self.addEventListener('activate'"),
    );

    expect(serviceWorker).toContain("event.data.type === 'SKIP_WAITING'");
    expect(installBlock).not.toContain('self.skipWaiting()');
  });
});
