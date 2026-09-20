import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // RLS tests share one database, so they must not run concurrently against it.
    fileParallelism: false,
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
    },
  },
});
