/**
 * Every function this project defines must pin its own `search_path`.
 *
 * This is not hygiene, it is a fixed bug. `DELETE FROM auth.users` runs inside GoTrue as
 * `supabase_auth_admin`, a role whose search_path does not include `public`. The delete
 * cascades into talent_profiles / client_profiles / portfolio_items, firing
 * `sync_user_role_flags` and `sync_portfolio_item_count` — which referenced `user_profiles`
 * and `talent_profiles` unqualified, resolved against the CALLER's path. Result:
 *
 *   ERROR: relation "user_profiles" does not exist (SQLSTATE 42P01)
 *
 * and the whole delete rolled back with a 500. Every account deletion through the admin API
 * had been failing. `lib/db/deletion.test.ts` stayed green the entire time, because it deletes
 * over DATABASE_URL as `postgres`, whose search_path *does* include public — the one role that
 * cannot reproduce the bug.
 *
 * So this suite checks the property directly rather than the path, because the path cannot be
 * reproduced from here: the local `postgres` role is not a superuser and cannot SET ROLE to
 * `supabase_auth_admin`. Migration 0019 is what these assertions pin.
 */

import { afterAll, expect, it } from 'vitest';
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

const reachable = await sql`select current_database()`.then(
  () => true,
  (e: Error) => {
    console.warn(`[functions.test] skipping — cannot reach ${DB_URL}: ${e.message}`);
    return false;
  },
);

afterAll(async () => {
  await sql.end({ timeout: 5 });
});

const maybe = reachable ? describeBlock : () => {};

function describeBlock() {
  itAnnouncesTarget(sql, DB_URL);

  /** Ours = defined in `public` and not owned by an extension (pgvector, pg_trgm, …). */
  const ours = async () => sql<
    { proname: string; prosecdef: boolean; proconfig: string[] | null }[]
  >`
    select p.proname, p.prosecdef, p.proconfig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and not exists (
         select 1 from pg_depend d
          where d.objid = p.oid and d.classid = 'pg_proc'::regclass and d.deptype = 'e'
       )
     order by p.proname`;

  it('finds the project functions at all — an empty list would pass every check below', async () => {
    const rows = await ours();
    expect(rows.length).toBeGreaterThanOrEqual(10);
  });

  it('pins search_path on every function it defines', async () => {
    const rows = await ours();
    const unpinned = rows
      .filter((r) => !(r.proconfig ?? []).some((c) => c.startsWith('search_path=')))
      .map((r) => r.proname);
    expect(unpinned).toEqual([]);
  });

  it('runs the cascade triggers as owner, or account deletion fails with a 500', async () => {
    // These two fire while auth.users is being deleted, as a role with no grants in `public`.
    // Without SECURITY DEFINER the resolved name is found and then refused:
    //   ERROR: permission denied for table user_profiles (SQLSTATE 42501)
    const rows = await ours();
    for (const name of ['sync_user_role_flags', 'sync_portfolio_item_count']) {
      const fn = rows.find((r) => r.proname === name);
      expect(fn, `${name} is missing from public`).toBeDefined();
      expect(fn!.prosecdef, `${name} must be SECURITY DEFINER`).toBe(true);
    }
  });
}

maybe();
