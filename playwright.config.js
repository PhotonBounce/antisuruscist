// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: 'list',
  timeout: 60000,
  expect: {
    timeout: 20000,
  },
  use: {
    baseURL: 'http://localhost:8080',
    headless: true,
    // Use domcontentloaded so we don't wait for network resources
    navigationTimeout: 30000,
    actionTimeout: 15000,
    // Suppress touches to avoid mobile redirect
    hasTouch: false,
    isMobile: false,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        hasTouch: false,
      },
    },
  ],

  webServer: {
    command: 'npx http-server -p 8080 -c-1 --silent',
    url: 'http://localhost:8080',
    reuseExistingServer: true,
    timeout: 30000,
  },
});
