import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E test configuration for AgencyOS
 *
 * Run with:
 *   npx playwright test               # all tests (headless)
 *   npx playwright test --headed      # with browser UI
 *   npx playwright test --project=chromium  # specific browser
 *   npx playwright show-report        # view HTML report
 *
 * Prerequisites:
 *   - Full stack running (docker compose up, or pnpm dev)
 *   - E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD env vars set (defaults to seed values)
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // sequential for stateful auth tests
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    actionTimeout: 10_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
