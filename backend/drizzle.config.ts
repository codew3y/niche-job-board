import { defineConfig } from 'drizzle-kit';

// One .env for the whole repo, at the root (drizzle-kit runs from backend/). Values already in
// the environment win, so CI is untouched.
try {
  process.loadEnvFile('../.env');
} catch {
  // No .env is fine: CI and one-off commands pass DATABASE_URL directly.
}

// Phase 1 — schema-first. `pnpm db:generate` emits SQL from backend/src/db/schema/*.
// DATABASE_URL is only needed for `db:migrate` / `db:studio`, not for generate.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
  verbose: true,
  strict: true,
  // Supabase owns these schemas; never diff or drop them.
  schemaFilter: ['public'],
  entities: {
    roles: { provider: 'supabase' },
  },
});
