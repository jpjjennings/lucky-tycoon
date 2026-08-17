import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'npm run dev -- --hostname 127.0.0.1 --port 3100',
      url: 'http://127.0.0.1:3100',
      reuseExistingServer: false,
    },
    {
      command: 'npm run multiplayer:server',
      url: 'http://127.0.0.1:3001/health',
      reuseExistingServer: false,
    },
  ],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
