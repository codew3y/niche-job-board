import { customType } from 'drizzle-orm/pg-core';

/**
 * `tsvector`, which drizzle has no built-in for.
 *
 * Declared as a custom type rather than left out of the schema entirely: a column that exists
 * in the database but not here is invisible to drizzle-kit, so every `db:generate` either
 * ignores it or proposes dropping it. That is how `jobs_fts_idx` survived for thirteen
 * migrations without anything querying it.
 *
 * Never read or written by the application — the columns using it are GENERATED ALWAYS, and
 * they are queried through PostgREST's textSearch rather than selected.
 */
export const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'tsvector';
  },
});
