import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  timeout: 30000,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm dev:renderer',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});