import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  // In CI the GitHub reporter annotates the run and the HTML report is kept as
  // an artifact for failures (issue #712).
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'html',
  // The Creator mounts in a loading state and fetches the catalog (~106 KB)
  // plus the workflow before rendering, which can exceed Playwright's 5 s
  // default on a shared runner (issue #725). Waiting longer only costs time
  // when something is actually broken.
  expect: { timeout: process.env.CI ? 15_000 : 5_000 },
  timeout: process.env.CI ? 60_000 : 30_000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // CI serves the production build (`next start`), which the workflow builds
    // beforehand: the turbopack dev server recompiles per route and makes the
    // Creator flow specs flaky and slow on shared runners.
    command: process.env.CI ? 'npm run start -- --port 3000' : 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
