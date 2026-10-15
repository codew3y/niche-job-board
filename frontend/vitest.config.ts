import { defineConfig } from 'vitest/config';

/**
 * Unit tests for the app's own pure helpers (formatting and the like). The backend workspace
 * has the bulk of the unit suite; the browser flows are Playwright specs in e2e/, which vitest
 * must never pick up.
 */
export default defineConfig({
  test: {
    include: ['components/**/*.test.ts', 'lib/**/*.test.ts'],
    exclude: ['**/node_modules/**', 'e2e/**'],
  },
});
