import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: 1,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: [
    {
      command: 'npm run start',
      port: 3001,
      timeout: 30_000,
      reuseExistingServer: true,
      cwd: '..',
    },
    {
      command: 'npm run dev',
      port: 5173,
      timeout: 30_000,
      reuseExistingServer: true,
      cwd: '../agent-creator',
    },
    {
      command: 'npm run dev',
      port: 3000,
      timeout: 60_000,
      reuseExistingServer: true,
      cwd: '../frontend',
    },
  ],
});
