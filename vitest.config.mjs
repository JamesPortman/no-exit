import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['e2e/**', 'node_modules/**'],
    // Picks up ADVENTURE_KEY (and friends) from .env.local so a local run
    // covers the sealed content exactly like CI does.
    setupFiles: ['./vitest.setup.js'],
  },
});
