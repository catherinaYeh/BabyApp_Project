import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for E2E tests.
 *
 * Tests assume the full stack is up (postgres via docker compose, api on
 * :3000, web dev server on :5173 with its API proxy). Run locally:
 *
 *   docker compose up -d
 *   pnpm --filter @baby/api dev        # in another shell
 *   pnpm --filter @baby/web dev        # in another shell
 *   pnpm --filter @baby/web exec playwright test
 *
 * Or rely on the `webServer` block below to auto-start the web dev server.
 * The API must already be running.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    locale: 'zh-Hant',
    timezoneId: 'Asia/Taipei',
  },
  projects: [
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
