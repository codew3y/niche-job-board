/**
 * What the PUBLIC pages can see.
 *
 * The browse and profile pages filter on `status = 'open'` and `is_published = true`, but
 * those filters are honesty, not protection — RLS is what actually enforces visibility. If
 * a policy regressed, the pages would keep "working" while leaking drafts, and no filter in
 * the application code would stop it.
 *
 * These run as the real `anon` role against real policies, exactly as a logged-out visitor
 * hits the site.
 */

import { afterAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';

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
  (e: Error) => {
    console.warn(`[public-visibility] skipping — cannot reach ${DB_URL}: ${e.message}`);
    return false;
  },
);

/** Query as a logged-out visitor, exactly as PostgREST would. */
async function asAnon<T>(fn: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  return sql.begin(async (tx) => {
    await tx.unsafe('SET LOCAL ROLE anon');
    await tx`select set_config('request.jwt.claim.sub', '', true)`;
    await tx`select set_config('request.jwt.claims', '{"role":"anon"}', true)`;
    return fn(tx);
  }) as Promise<T>;
}

afterAll(async () => {
  await sql.end();
});

const maybe = reachable ? describe : describe.skip;

maybe('jobs visible to the public', () => {
  it('shows open jobs', async () => {
    const rows = await asAnon((tx) => tx`select id from jobs where status = 'open'`);
    expect(rows.length).toBeGreaterThan(0);
  });

  it('HIDES drafts — even though the seed contains some', async () => {
    const seeded = await sql`select count(*)::int as n from jobs where status = 'draft'`;
    expect(Number(seeded[0]!.n)).toBeGreaterThan(0); // the fixture must actually test something

    const visible = await asAnon((tx) => tx`select id from jobs where status = 'draft'`);
    expect(visible).toHaveLength(0);
  });

  it('hides drafts from an unfiltered query too, not just a filtered one', async () => {
    // The browse page filters by status. This proves the policy would hold even if it did not.
    const [anonCount] = await asAnon((tx) => tx`select count(*)::int as n from jobs`);
    const [ownerCount] = await sql`select count(*)::int as n from jobs where status <> 'draft'`;
    expect(Number(anonCount!.n)).toBe(Number(ownerCount!.n));
  });
});

maybe('talent profiles visible to the public', () => {
  it('shows published profiles', async () => {
    const rows = await asAnon((tx) => tx`select id from talent_profiles where is_published`);
    expect(rows.length).toBeGreaterThan(0);
  });

  it('HIDES unpublished profiles', async () => {
    const seeded = await sql`select count(*)::int as n from talent_profiles where not is_published`;
    expect(Number(seeded[0]!.n)).toBeGreaterThan(0);

    const visible = await asAnon((tx) => tx`select id from talent_profiles where not is_published`);
    expect(visible).toHaveLength(0);
  });

  it('hides the portfolio items of an unpublished profile', async () => {
    // Items are readable via the profile, so a leak here would expose work from a draft.
    const rows = await asAnon(
      (tx) => tx`select i.id from portfolio_items i
                 join talent_profiles p on p.id = i.talent_id
                 where not p.is_published`,
    );
    expect(rows).toHaveLength(0);
  });
});

maybe('what the public must never see', () => {
  it('cannot read applications', async () => {
    expect(await asAnon((tx) => tx`select id from applications`)).toHaveLength(0);
  });

  it('cannot read conversations or messages', async () => {
    expect(await asAnon((tx) => tx`select id from conversations`)).toHaveLength(0);
    expect(await asAnon((tx) => tx`select id from messages`)).toHaveLength(0);
  });

  it('cannot read match_cache — the the score-asymmetry rule score must not leak', async () => {
    expect(await asAnon((tx) => tx`select id from match_cache`)).toHaveLength(0);
  });

  it('cannot read saved lists', async () => {
    expect(await asAnon((tx) => tx`select * from saved_jobs`)).toHaveLength(0);
    expect(await asAnon((tx) => tx`select * from saved_talent`)).toHaveLength(0);
  });

  it('cannot read notifications', async () => {
    expect(await asAnon((tx) => tx`select id from notifications`)).toHaveLength(0);
  });

  it('can read the approved skill taxonomy, which the picker needs', async () => {
    const rows = await asAnon((tx) => tx`select id from skills where is_approved`);
    expect(rows.length).toBeGreaterThan(100);
  });
});
