/**
 * Saved lists are private in a specific, asymmetric way: the owner can read their own, and
 * the other party has NO read path at all. A talent must never be able to learn which
 * clients bookmarked them — a visible signal is one people optimise for.
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';

import { itAnnouncesTarget } from '../db/test-target';

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

const CLIENT = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const TALENT = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const RIVAL = '12121212-1212-4121-8121-121212121212';
let ids = { client: '', talent: '', job: '' };

async function mkUser(id: string, email: string) {
  await sql`insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
            values (${id}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', ${email}, 'x', now(), now())`;
  await sql`insert into user_profiles (user_id, display_name) values (${id}, ${email})`;
}

async function asUser<T>(
  userId: string,
  fn: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  return sql.begin(async (tx) => {
    await tx.unsafe('SET LOCAL ROLE authenticated');
    await tx`select set_config('request.jwt.claim.sub', ${userId}, true)`;
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, role: 'authenticated' })}, true)`;
    return fn(tx);
  }) as Promise<T>;
}

async function reset() {
  await sql`delete from auth.users where id in (${CLIENT}, ${TALENT}, ${RIVAL})`;
  await mkUser(CLIENT, 'saved-client@example.test');
  await mkUser(TALENT, 'saved-talent@example.test');
  await mkUser(RIVAL, 'saved-rival@example.test');

  const [c] =
    await sql`insert into client_profiles (user_id, company_name) values (${CLIENT}, 'Saver') returning id`;
  const [t] =
    await sql`insert into talent_profiles (user_id, slug, headline, bio, website_url, is_published)
    values (${TALENT}, 'saved-talent', 'Dev', ${'b'.repeat(200)}, 'https://e.test/s', true) returning id`;
  const [j] =
    await sql`insert into jobs (client_id, title, slug, description, engagement_type, status, published_at)
    values (${c!.id}, 'Saveable role', 'saveable-role', 'desc', 'fixed', 'open', now()) returning id`;

  ids = { client: c!.id, talent: t!.id, job: j!.id };
  await sql`insert into saved_talent (client_id, talent_id) values (${c!.id}, ${t!.id})`;
  await sql`insert into saved_jobs (talent_id, job_id) values (${t!.id}, ${j!.id})`;
}

afterAll(async () => {
  if (reachable) await sql`delete from auth.users where id in (${CLIENT}, ${TALENT}, ${RIVAL})`;
  await sql.end();
});

itAnnouncesTarget(sql, DB_URL);

const maybe = reachable ? describe : describe.skip;

maybe('saved_talent — the client bookmarking a developer', () => {
  beforeEach(reset);

  it('the client sees their own list', async () => {
    const rows = await asUser(CLIENT, (tx) => tx`select * from saved_talent`);
    expect(rows).toHaveLength(1);
  });

  it('THE TALENT CANNOT SEE THEY WERE SAVED', async () => {
    // The point of the asymmetry. A "3 clients saved you" signal is one people would
    // optimise for; an invisible one they cannot.
    const rows = await asUser(TALENT, (tx) => tx`select * from saved_talent`);
    expect(rows).toHaveLength(0);
  });

  it('another client cannot see this client’s list', async () => {
    const rows = await asUser(RIVAL, (tx) => tx`select * from saved_talent`);
    expect(rows).toHaveLength(0);
  });

  it('a rival cannot write into another client’s list', async () => {
    await expect(
      asUser(
        RIVAL,
        (tx) =>
          tx`insert into saved_talent (client_id, talent_id) values (${ids.client}, ${ids.talent})`,
      ),
    ).rejects.toThrow(/row-level security/i);
  });
});

maybe('saved_jobs — the developer bookmarking a job', () => {
  beforeEach(reset);

  it('the talent sees their own list', async () => {
    const rows = await asUser(TALENT, (tx) => tx`select * from saved_jobs`);
    expect(rows).toHaveLength(1);
  });

  it('THE JOB OWNER CANNOT SEE WHO SAVED IT', async () => {
    const rows = await asUser(CLIENT, (tx) => tx`select * from saved_jobs`);
    expect(rows).toHaveLength(0);
  });

  it('saving the same job twice is a primary-key violation, which is why the action toggles', async () => {
    await expect(
      sql`insert into saved_jobs (talent_id, job_id) values (${ids.talent}, ${ids.job})`,
    ).rejects.toThrow(/duplicate key|saved_jobs_pkey/i);
  });

  it('a saved job survives being closed, so the list does not silently shrink', async () => {
    await sql`update jobs set status = 'closed' where id = ${ids.job}`;
    const rows = await asUser(TALENT, (tx) => tx`select * from saved_jobs`);
    expect(rows).toHaveLength(1);
  });

  it('but a DELETED job takes its bookmark with it', async () => {
    await sql`delete from jobs where id = ${ids.job}`;
    const rows = await asUser(TALENT, (tx) => tx`select * from saved_jobs`);
    expect(rows).toHaveLength(0);
  });
});
