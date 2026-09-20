import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

/**
 * Server-side database client.
 *
 * This connects as the database owner and therefore BYPASSES RLS. It is for migrations,
 * seeding and service-role work only. Anything acting on behalf of a signed-in user must go
 * through the Supabase client so that `auth.uid()` is set and the policies in
 * lib/db/schema/* actually apply (Phase 2).
 */
export function createDbClient(url = process.env.DATABASE_URL) {
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env, then run `npm run db:start`.',
    );
  }
  const sql = postgres(url, { max: 4, onnotice: () => {} });
  return { db: drizzle(sql, { schema }), sql };
}

export type Database = ReturnType<typeof createDbClient>['db'];
