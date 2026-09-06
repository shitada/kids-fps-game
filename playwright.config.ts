import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 4173);

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `npm run build && npm run preview -- --port ${port} --strictPort`,
    port,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit-ipad',
      use: {
        ...devices['iPad (gen 7) landscape'],
      },
    },
    {
      name: 'webkit-iphone',
      use: {
        ...devices['iPhone 13 landscape'],
      },
    },
  ],
});
