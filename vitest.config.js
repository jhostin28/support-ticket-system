// Vitest configuration.
//
// The only thing this does is point the tests at .env.test instead of .env,
// so they run against support_ticket_system_test. Without it they would read
// and write the real database, and a test that cleans up after itself would
// delete real data.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      NODE_ENV: 'test',
    },
    setupFiles: ['./tests/setup.js'],
  },
});