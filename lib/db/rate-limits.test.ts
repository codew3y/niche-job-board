/**
 * Rate limits enforced by the database (migration 0024), as the API roles see them.
 * docs/api.md §3: applying, publishing jobs and reporting are each 10 per minute.
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

const CLIENT = 'aaaa0000-0000-4000-8000-0000000000c1';
const DEV = 'aaaa0000-0000-4000-8000-0000000000d1';
const OTHER = 'aaaa0000-0000-4000-8000-0000000000d2';
let clientId = '';
let talentId = '';
let otherTalentId = '';

async function as<T>(userId: string, fn: (tx: postgres.TransactionSql) => Promise<T>) {
  return sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL ROLE authenticated`);
    await tx`select set_config('request.jwt.claim.sub', ${userId}, true)`;
    await tx`select set_config('request.jwt.claims',
                               ${JSON.stringify({ sub: userId, role: 'authenticated' })}, true)`;
    return fn(tx);
  }) as Promise<T>;
}

const maybe = reachable ? describe : describe.skip;
itAnnouncesTarget(sql, DB_URL);

beforeEach(async () => {
  if (!reachable) return;
  if (otherTalentId) await sql`delete from reports where subject_id = ${otherTalentId}`;
  await sql`delete from auth.users where id in (${CLIENT}, ${DEV}, ${OTHER})`;
  for (const [id, email] of [
    [CLIENT, 'rl-client@example.test'],
    [DEV, 'rl-dev@example.test'],
    [OTHER, 'rl-other@example.test'],
  ] as const) {
    await sql`insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
              values (${id}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', ${email}, 'x', now(), now())`;
    await sql`insert into user_profiles (user_id, display_name) values (${id}, ${email})`;
  }
  clientId = (
    await sql`insert into client_profiles (user_id, company_name) values (${CLIENT}, 'Limits Co') returning id`
  )[0]!.id;
  talentId = (
    await sql`insert into talent_profiles (user_id, slug, headline, bio, is_published) values (${DEV}, 'rl-dev', 'Limits developer', '', true) returning id`
  )[0]!.id;
  otherTalentId = (
    await sql`insert into talent_profiles (user_id, slug, headline, bio, is_published) values (${OTHER}, 'rl-other', 'Other developer', '', true) returning id`
  )[0]!.id;
  // Twelve open jobs, made by the owner role (not limited), for the applicants to apply to.
  for (let i = 0; i < 12; i++) {
    await sql`insert into jobs (client_id, title, slug, description, engagement_type, status, published_at)
              values (${clientId}, ${`Limit job ${i}`}, ${`rl-job-${i}`}, ${'x'.repeat(130)}, 'fixed', 'open', now() - interval '1 hour')`;
  }
});

afterAll(async () => {
  if (reachable) {
    await sql`delete from reports where subject_id = ${otherTalentId}`;
    await sql`delete from auth.users where id in (${CLIENT}, ${DEV}, ${OTHER})`;
  }
  await sql.end();
});

const jobIds = () =>
  sql`select id from jobs where client_id = ${clientId} order by slug`.then((r) =>
    r.map((x) => x.id as string),
  );

maybe('applying: 10 a minute', () => {
  it('refuses the 11th application in a minute, and only for that developer', async () => {
    const jobs = await jobIds();
    for (let i = 0; i < 10; i++) {
      await as(
        DEV,
        (tx) =>
          tx`insert into applications (job_id, talent_id, cover_note) values (${jobs[i]!}, ${talentId}, ${'A considered note about fit.'})`,
      );
    }
    await expect(
      as(
        DEV,
        (tx) =>
          tx`insert into applications (job_id, talent_id, cover_note) values (${jobs[10]!}, ${talentId}, ${'One more note.'})`,
      ),
    ).rejects.toThrow(/rate_limited: applications/);
    // Someone else is not affected.
    await as(
      OTHER,
      (tx) =>
        tx`insert into applications (job_id, talent_id, cover_note) values (${jobs[10]!}, ${otherTalentId}, ${'Different developer.'})`,
    );
  });
});

maybe('publishing jobs: 10 a minute', () => {
  it('refuses the 11th job made open in a minute; drafts and edits do not count', async () => {
    for (let i = 0; i < 10; i++) {
      await as(
        CLIENT,
        (
          tx,
        ) => tx`insert into jobs (client_id, title, slug, description, engagement_type, status, published_at)
                                  values (${clientId}, ${`Fresh ${i}`}, ${`rl-fresh-${i}`}, ${'x'.repeat(130)}, 'fixed', 'open', now())`,
      );
    }
    await expect(
      as(
        CLIENT,
        (
          tx,
        ) => tx`insert into jobs (client_id, title, slug, description, engagement_type, status, published_at)
                            values (${clientId}, 'One too many', 'rl-too-many', ${'x'.repeat(130)}, 'fixed', 'open', now())`,
      ),
    ).rejects.toThrow(/rate_limited: jobs/);
    // A draft is fine, and so is editing a job that is already open.
    await as(
      CLIENT,
      (tx) => tx`insert into jobs (client_id, title, slug, description, engagement_type, status)
                                values (${clientId}, 'A draft', 'rl-draft', ${'x'.repeat(130)}, 'fixed', 'draft')`,
    );
    await as(CLIENT, (tx) => tx`update jobs set title = 'Edited title' where slug = 'rl-fresh-0'`);
  });
});

maybe('reporting: 10 a minute', () => {
  it('refuses the 11th report in a minute', async () => {
    for (let i = 0; i < 10; i++) {
      await as(
        DEV,
        (tx) => tx`insert into reports (reporter_id, subject_type, subject_id, reason)
                              values (${DEV}, 'profile', ${otherTalentId}, ${`report ${i}`})`,
      );
    }
    await expect(
      as(
        DEV,
        (tx) => tx`insert into reports (reporter_id, subject_type, subject_id, reason)
                        values (${DEV}, 'profile', ${otherTalentId}, 'eleventh')`,
      ),
    ).rejects.toThrow(/rate_limited: reports/);
  });
});
