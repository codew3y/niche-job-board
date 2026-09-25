/**
 * Index coverage, asked of the catalogue rather than assumed from reading code.
 *
 * Postgres indexes the REFERENCED side of a foreign key automatically and never the
 * referencing side. That asymmetry is invisible until a DELETE gets slow — and account
 * deletion here touches most tables, so an unindexed FK turns one delete into a sequential
 * scan of every child table.
 *
 * Seven were missing when this was first run. The test is the guard: a new foreign key
 * without an index fails here rather than degrading quietly.
 */

import { afterAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';

import { itAnnouncesTarget } from './test-target';

const DB_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const sql: postgres.Sql = postgres(DB_URL, {
  max: 2,
  idle_timeout: 5,
  connect_timeout: 5,
  onnotice: () => {},
});
const reachable = await sql`select 1`.then(
  () => true,
  () => false,
);

afterAll(async () => {
  await sql.end();
});

itAnnouncesTarget(sql, DB_URL);

const maybe = reachable ? describe : describe.skip;

maybe('index coverage', () => {
  it('EVERY FOREIGN KEY HAS AN INDEX ON ITS REFERENCING COLUMN', async () => {
    const rows = await sql`
      select c.conrelid::regclass::text || '.' || a.attname as fk
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
      where c.contype = 'f' and c.connamespace = 'public'::regnamespace
        and not exists (
          select 1 from pg_index i
          where i.indrelid = c.conrelid and i.indkey[0] = c.conkey[1]
        )
      order by 1`;
    expect(rows.map((r) => r.fk)).toEqual([]);
  });

  it('the hot list queries have an index the planner can use', async () => {
    // Asserts the index EXISTS and covers the predicate, not that the planner picks it — at
    // seed scale a sequential scan over thirty rows is correctly cheaper, and asserting
    // otherwise would be asserting the planner is wrong.
    const required = [
      { table: 'jobs', index: 'jobs_status_published_idx' },
      { table: 'talent_profiles', index: 'talent_published_idx' },
      { table: 'match_cache', index: 'match_cache_lookup_idx' },
      { table: 'applications', index: 'applications_job_idx' },
      { table: 'messages', index: 'messages_conversation_idx' },
    ];
    const present = await sql`select indexname from pg_indexes where schemaname = 'public'`;
    const names = new Set(present.map((r) => r.indexname as string));
    expect(required.filter((r) => !names.has(r.index)).map((r) => r.index)).toEqual([]);
  });

  it('the vector columns have HNSW indexes, not btree', async () => {
    // A btree on a vector column is accepted and useless: it cannot answer a <=> ordering,
    // so retrieval would silently fall back to a full scan of every embedding.
    const rows = await sql`
      select indexname from pg_indexes
      where schemaname = 'public' and indexdef ilike '%hnsw%'`;
    const names = rows.map((r) => r.indexname as string);
    expect(names).toContain('jobs_embedding_hnsw_idx');
    expect(names).toContain('talent_embedding_hnsw_idx');
  });

  it('full-text search indexes the generated column, not an expression', async () => {
    // PostgREST cannot target an expression index, so an index on to_tsvector(...) exists and
    // is never used — which is exactly what happened before migration 0013.
    const rows = await sql`
      select indexdef from pg_indexes
      where schemaname = 'public' and indexname in ('jobs_search_idx', 'talent_search_idx')`;
    expect(rows).toHaveLength(2);
    for (const r of rows) expect(r.indexdef as string).toMatch(/search_vector/);
  });
});
