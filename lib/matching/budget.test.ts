/**
 * The daily AI cap.
 *
 * Tested against the database because the guarantee lives in one SQL statement. A
 * read-then-write in TypeScript would pass every test written against a single caller and
 * fail in production by exactly the amount of concurrency available — two callers reading
 * "999 used" both decide there is room, and both spend.
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';

import { itAnnouncesTarget } from '../db/test-target';

const DB_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const sql: postgres.Sql = postgres(DB_URL, {
  max: 8,
  idle_timeout: 5,
  connect_timeout: 5,
  onnotice: () => {},
});
const reachable = await sql`select 1`.then(
  () => true,
  () => false,
);

const reserve = (kind: string, limit: number) =>
  sql`select public.reserve_ai_call(${kind}, ${limit}) as ok`.then((r) => r[0]!.ok as boolean);

async function reset() {
  await sql`delete from ai_usage where day = current_date`;
}

afterAll(async () => {
  if (reachable) await reset();
  await sql.end();
});

itAnnouncesTarget(sql, DB_URL);

const maybe = reachable ? describe : describe.skip;

maybe('reserve_ai_call', () => {
  beforeEach(reset);

  it('allows a call under the cap and counts it', async () => {
    expect(await reserve('embedding', 5)).toBe(true);
    const [row] =
      await sql`select calls from ai_usage where day = current_date and kind = 'embedding'`;
    expect(row!.calls).toBe(1);
  });

  it('REFUSES ONCE THE CAP IS REACHED', async () => {
    for (let i = 0; i < 3; i++) expect(await reserve('embedding', 3)).toBe(true);
    expect(await reserve('embedding', 3)).toBe(false);
  });

  it('DOES NOT COUNT A REFUSED CALL', async () => {
    // A refused call spent nothing, so counting it would make the counter drift past the cap
    // and stay there — the ceiling would fall a little further every day.
    for (let i = 0; i < 2; i++) await reserve('embedding', 2);
    await reserve('embedding', 2);
    await reserve('embedding', 2);
    const [row] =
      await sql`select calls from ai_usage where day = current_date and kind = 'embedding'`;
    expect(row!.calls).toBe(2);
  });

  it('HOLDS UNDER CONCURRENCY — the whole reason this is one statement', async () => {
    // Ten simultaneous callers against a cap of 4. A read-then-write lets all ten through.
    const results = await Promise.all(Array.from({ length: 10 }, () => reserve('embedding', 4)));
    expect(results.filter(Boolean)).toHaveLength(4);
    const [row] =
      await sql`select calls from ai_usage where day = current_date and kind = 'embedding'`;
    expect(row!.calls).toBe(4);
  });

  it('counts embedding and rerank separately', async () => {
    await reserve('embedding', 1);
    // A separate budget, so a burst of embeddings cannot starve re-ranking of its own.
    expect(await reserve('rerank', 1)).toBe(true);
    expect(await reserve('embedding', 1)).toBe(false);
  });

  it('refuses a kind that is not one of the two', async () => {
    await expect(reserve('image_generation', 10)).rejects.toThrow(/ai_usage_kind/);
  });

  it('starts a fresh budget on a new day', async () => {
    // Yesterday's exhaustion must not bleed into today. Upsert: a local database that really
    // did make calls yesterday already has that row, and a plain insert collided with it.
    await sql`insert into ai_usage (day, kind, calls) values (current_date - 1, 'embedding', 9999)
              on conflict (day, kind) do update set calls = 9999`;
    expect(await reserve('embedding', 2)).toBe(true);
    await sql`delete from ai_usage where day = current_date - 1`;
  });

  it('IS UNREADABLE BY ORDINARY USERS', async () => {
    // It says nothing a user needs, and it tells a reader exactly how close the project is
    // to its ceiling.
    await reserve('embedding', 5);
    const rows = await sql.begin(async (tx) => {
      await tx.unsafe('SET LOCAL ROLE authenticated');
      return tx`select * from ai_usage`;
    });
    expect(rows).toHaveLength(0);
  });

  it('cannot be called by an ordinary user either', async () => {
    await expect(
      sql.begin(async (tx) => {
        await tx.unsafe('SET LOCAL ROLE authenticated');
        return tx`select public.reserve_ai_call('embedding', 999999)`;
      }),
    ).rejects.toThrow(/permission denied/i);
  });
});
