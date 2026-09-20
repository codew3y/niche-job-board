import { defineConfig } from 'drizzle-kit';

// Phase 1 — schema-first. `pnpm db:generate` emits SQL from lib/db/schema/*.
// DATABASE_URL is only needed for `db:migrate` / `db:studio`, not for generate.
export default defineConfig({
  dialect: 'postgresql',
  schema: './lib/db/schema/index.ts',
  out: './lib/db/migrations',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
  verbose: true,
  strict: true,
  // Supabase owns these schemas; never diff or drop them.
  schemaFilter: ['public'],
  entities: {
    roles: { provider: 'supabase' },
  },
});
