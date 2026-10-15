/**
 * Resume import limits (migration 0023), against the database.
 *
 * reserve_resume_import() spends the caller's own daily allowance and nobody else's; the usage
 * table cannot be read or written through the API; ai_usage accepts the new 'resume_import' kind.
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
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

const A = 'aeaeaeae-0000-4000-8000-00000000000a';
const B = 'aeaeaeae-0000-4000-8000-00000000000b';

async function asUser<T>(userId: string, fn: (tx: postgres.TransactionSql) => Promise<T>) {
  return sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL ROLE authenticated`);
    await tx`select set_config('request.jwt.claim.sub', ${userId}, true)`;
    await tx`select set_config('request.jwt.claims',
                               ${JSON.stringify({ sub: userId, role: 'authenticated' })}, true)`;
    return fn(tx);
  }) as Promise<T>;
}

const reserve = (userId: string, limit: number) =>
  asUser(userId, (tx) => tx`select reserve_resume_import(${limit}) as ok`).then(
    (r) => r[0]!.ok as boolean,
  );

const maybe = reachable ? describe : describe.skip;
itAnnouncesTarget(sql, DB_URL);

beforeEach(async () => {
  if (!reachable) return;
  await sql`delete from auth.users where id in (${A}, ${B})`;
  for (const [id, email] of [
    [A, 'import-a@example.test'],
    [B, 'import-b@example.test'],
  ] as const) {
    await sql`insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
              values (${id}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', ${email}, 'x', now(), now())`;
  }
});

afterAll(async () => {
  if (reachable) await sql`delete from auth.users where id in (${A}, ${B})`;
  await sql.end();
});

maybe('the per-person daily allowance', () => {
  it('allows up to the limit, then refuses', async () => {
    expect(await reserve(A, 2)).toBe(true);
    expect(await reserve(A, 2)).toBe(true);
    expect(await reserve(A, 2)).toBe(false);
  });

  it("one person's use does not spend another's", async () => {
    expect(await reserve(A, 1)).toBe(true);
    expect(await reserve(A, 1)).toBe(false);
    expect(await reserve(B, 1)).toBe(true);
  });

  it('is unreadable and unwritable through the API', async () => {
    await reserve(A, 5);
    const rows = await asUser(A, (tx) => tx`select * from resume_import_usage`);
    expect(rows).toHaveLength(0);
    await expect(
      asUser(
        A,
        (tx) =>
          tx`insert into resume_import_usage (user_id, day, calls) values (${A}, current_date, 0)`,
      ),
    ).rejects.toThrow(/row-level security|permission denied/);
  });

  it('goes with the account', async () => {
    await reserve(A, 5);
    await sql`delete from auth.users where id = ${A}`;
    const [r] = await sql`select count(*)::int as n from resume_import_usage where user_id = ${A}`;
    expect(r!.n).toBe(0);
  });
});

maybe('the site-wide budget', () => {
  it("accepts the 'resume_import' kind", async () => {
    const day = '2001-01-01';
    await sql`delete from ai_usage where day = ${day}`;
    await sql`insert into ai_usage (day, kind, calls) values (${day}, 'resume_import', 1)`;
    await sql`delete from ai_usage where day = ${day}`;
  });
});
