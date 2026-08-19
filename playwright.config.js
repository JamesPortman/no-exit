// E2E config: chromium only, against the local dev server (file store — no
// Redis needed), mirroring Terra Incognita's setup.
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  fullyParallel: false, // one worker: specs share the dev server's file store
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://localhost:3400',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node dev-server.js',
    url: 'http://localhost:3400',
    reuseExistingServer: !process.env.CI,
    // A fixed seed so the solo spec can compute the answers to the run it is
    // given. The server honours this only when VERCEL_ENV is unset, so it can
    // never apply in production or preview.
    env: { ...process.env, SOLO_TEST_SEED: 'e2e-solo-seed' },
  },
});
