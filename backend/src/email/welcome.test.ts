/**
 * The welcome email must be sent exactly once per account.
 *
 * The guarantee is not in backend/src/email/welcome.ts — it is in the database, in the `is null`
 * predicate on the UPDATE. This suite tests THAT, because a read-then-write in the
 * application would pass any test written against the application and still double-send under
 * two concurrent requests: both reads see null, both proceed, both send.
 *
 * Two landing routes call the sender (/auth/confirm and /auth/callback), and a redirect can
 * be retried by the browser, so concurrency here is ordinary rather than theoretical.
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';

import { itAnnouncesTarget } from '../db/test-target';

const DB_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const sql: postgres.Sql = postgres(DB_URL, {
  max: 4,
  idle_timeout: 5,
  connect_timeout: 5,
  onnotice: () => {},
});
const reachable = await sql`select 1`.then(
  () => true,
  () => false,
);

const USER = '81818181-8181-4181-8181-818181818181';

async function reset() {
  await sql`delete from auth.users where id = ${USER}`;
  await sql`insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
            values (${USER}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'welcome@example.test', 'x', now(), now())`;
  await sql`insert into user_profiles (user_id, display_name) values (${USER}, 'Ada')`;
}

/** Exactly the statement backend/src/email/welcome.ts issues. */
const claim = (tx: postgres.Sql | postgres.TransactionSql) =>
  tx`update user_profiles set welcomed_at = now()
     where user_id = ${USER} and welcomed_at is null
     returning display_name`;

afterAll(async () => {
  if (reachable) await sql`delete from auth.users where id = ${USER}`;
  await sql.end();
});

itAnnouncesTarget(sql, DB_URL);

const maybe = reachable ? describe : describe.skip;

maybe('welcomed_at — claim before send', () => {
  beforeEach(reset);

  it('starts null on a new account', async () => {
    const [row] = await sql`select welcomed_at from user_profiles where user_id = ${USER}`;
    expect(row!.welcomed_at).toBeNull();
  });

  it('the first claim wins and returns the name to greet', async () => {
    const rows = await claim(sql);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.display_name).toBe('Ada');
  });

  it('A SECOND CLAIM RETURNS NOTHING, so nothing is sent twice', async () => {
    await claim(sql);
    const second = await claim(sql);
    expect(second).toHaveLength(0);
  });

  it('TWO CONCURRENT CLAIMS PRODUCE EXACTLY ONE SEND', async () => {
    // The case a read-then-write in the application would fail: both reads see null, both
    // decide to send. Here the second UPDATE finds no row matching `welcomed_at is null`
    // once the first commits.
    const results = await Promise.all([claim(sql), claim(sql), claim(sql), claim(sql)]);
    const winners = results.filter((r) => r.length === 1);
    expect(winners).toHaveLength(1);
  });

  it('does not touch any other account', async () => {
    await claim(sql);
    const [others] =
      await sql`select count(*)::int as n from user_profiles where user_id <> ${USER} and welcomed_at is not null`;
    expect(others!.n).toBe(0);
  });

  it('survives account deletion with the account, leaving nothing behind', async () => {
    await claim(sql);
    await sql`delete from auth.users where id = ${USER}`;
    const rows = await sql`select 1 from user_profiles where user_id = ${USER}`;
    expect(rows).toHaveLength(0);
  });
});
