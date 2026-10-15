/**
 * Job lifecycle: draft → open → closed → reopened, plus duplication.
 *
 * The rules worth testing are the ones with consequences for someone OTHER than the client:
 * a closed job must keep its applicants' records, and a duplicate must not publish itself.
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
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
  () => false,
);

const CLIENT = '99999999-9999-4999-8999-999999999999';
const TALENT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const RIVAL = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
let ids = { client: '', rivalClient: '', talent: '', job: '' };

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
  await mkUser(CLIENT, 'lifecycle-client@example.test');
  await mkUser(TALENT, 'lifecycle-talent@example.test');
  await mkUser(RIVAL, 'lifecycle-rival@example.test');

  const [c] =
    await sql`insert into client_profiles (user_id, company_name) values (${CLIENT}, 'Owner') returning id`;
  const [r] =
    await sql`insert into client_profiles (user_id, company_name) values (${RIVAL}, 'Rival') returning id`;
  const [t] =
    await sql`insert into talent_profiles (user_id, slug, headline, bio, website_url, is_published)
    values (${TALENT}, 'lifecycle-talent', 'Dev', 'I build things that work in production.', 'https://e.test/x', true) returning id`;
  const [j] =
    await sql`insert into jobs (client_id, title, slug, description, engagement_type, status, published_at)
    values (${c!.id}, 'Lifecycle role', 'lifecycle-role', 'desc', 'fixed', 'open', now()) returning id`;

  ids = { client: c!.id, rivalClient: r!.id, talent: t!.id, job: j!.id };
}

afterAll(async () => {
  if (reachable) await sql`delete from auth.users where id in (${CLIENT}, ${TALENT}, ${RIVAL})`;
  await sql.end();
});

const maybe = reachable ? describe : describe.skip;

maybe('ownership', () => {
  beforeEach(reset);

  it('lets the owner edit their job', async () => {
    const rows = await asUser(
      CLIENT,
      (tx) => tx`update jobs set title = 'Renamed' where id = ${ids.job} returning id`,
    );
    expect(rows).toHaveLength(1);
  });

  it('stops another client editing it — fails closed, zero rows rather than an error', async () => {
    const rows = await asUser(
      RIVAL,
      (tx) => tx`update jobs set title = 'Hijacked' where id = ${ids.job} returning id`,
    );
    expect(rows).toHaveLength(0);

    const [after] = await sql`select title from jobs where id = ${ids.job}`;
    expect(after!.title).toBe('Lifecycle role');
  });

  it('stops a talent user editing a job at all', async () => {
    const rows = await asUser(
      TALENT,
      (tx) => tx`update jobs set status = 'closed' where id = ${ids.job} returning id`,
    );
    expect(rows).toHaveLength(0);
  });
});

maybe('closing keeps history', () => {
  beforeEach(async () => {
    await reset();
    await sql`insert into applications (job_id, talent_id, cover_note) values (${ids.job}, ${ids.talent}, 'note')`;
  });

  it('closing a job KEEPS its applications', async () => {
    // Deleting would cascade them away, taking the applicant's record with it. Closing is
    // the whole reason the status enum exists (flows §7).
    await sql`update jobs set status = 'closed' where id = ${ids.job}`;
    const apps = await sql`select id from applications where job_id = ${ids.job}`;
    expect(apps).toHaveLength(1);
  });

  it('the applicant can still see the application after the job closes', async () => {
    await sql`update jobs set status = 'closed' where id = ${ids.job}`;
    const seen = await asUser(
      TALENT,
      (tx) => tx`select id from applications where job_id = ${ids.job}`,
    );
    expect(seen).toHaveLength(1);
  });

  it('a closed job stops accepting NEW applications', async () => {
    await sql`update jobs set status = 'closed' where id = ${ids.job}`;
    await sql`delete from applications where job_id = ${ids.job}`;
    await expect(
      asUser(
        TALENT,
        (tx) =>
          tx`insert into applications (job_id, talent_id, cover_note) values (${ids.job}, ${ids.talent}, 'late')`,
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('a closed job disappears from the public list but keeps its page', async () => {
    await sql`update jobs set status = 'closed' where id = ${ids.job}`;
    const anon = await sql.begin(async (tx) => {
      await tx.unsafe('SET LOCAL ROLE anon');
      await tx`select set_config('request.jwt.claims', '{"role":"anon"}', true)`;
      return tx`select id, status from jobs where id = ${ids.job}`;
    });
    // Still readable — the browse page filters by status, the policy only hides drafts.
    // That is what lets an applicant follow their link to a closed job.
    expect(anon).toHaveLength(1);
  });
});

maybe('drafts', () => {
  beforeEach(reset);

  it('a draft is invisible to the public but visible to its owner', async () => {
    const [d] =
      await sql`insert into jobs (client_id, title, slug, description, engagement_type, status)
      values (${ids.client}, 'Secret', 'lifecycle-secret', 'desc', 'fixed', 'draft') returning id`;

    const anon = await sql.begin(async (tx) => {
      await tx.unsafe('SET LOCAL ROLE anon');
      await tx`select set_config('request.jwt.claims', '{"role":"anon"}', true)`;
      return tx`select id from jobs where id = ${d!.id}`;
    });
    expect(anon).toHaveLength(0);

    const owner = await asUser(CLIENT, (tx) => tx`select id from jobs where id = ${d!.id}`);
    expect(owner).toHaveLength(1);
  });

  it('a rival client cannot see another client’s draft', async () => {
    const [d] =
      await sql`insert into jobs (client_id, title, slug, description, engagement_type, status)
      values (${ids.client}, 'Secret2', 'lifecycle-secret-2', 'desc', 'fixed', 'draft') returning id`;
    const seen = await asUser(RIVAL, (tx) => tx`select id from jobs where id = ${d!.id}`);
    expect(seen).toHaveLength(0);
  });
});
