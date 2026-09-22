/**
 * The apply loop, against real policies and real constraints.
 *
 * The rules under test are split across three layers by design, so testing any one of them
 * alone would prove little:
 *   - one-per-job is a UNIQUE constraint
 *   - who may write is RLS
 *   - which transitions are legal is the transition table
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';

import { allowedStatusTransitions } from '../schemas/enums';

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
    console.warn(`[apply-flow] skipping — ${e.message}`);
    return false;
  },
);

const TALENT = '66666666-6666-4666-8666-666666666666';
const CLIENT = '77777777-7777-4777-8777-777777777777';
const OTHER = '88888888-8888-4888-8888-888888888888';

let ids = { talent: '', client: '', job: '', closedJob: '' };

async function mkUser(id: string, email: string) {
  await sql`insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
            values (${id}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
                    ${email}, 'x', now(), now())`;
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
  await sql`delete from auth.users where id in (${TALENT}, ${CLIENT}, ${OTHER})`;
  await mkUser(TALENT, 'apply-talent@example.test');
  await mkUser(CLIENT, 'apply-client@example.test');
  await mkUser(OTHER, 'apply-other@example.test');

  const [t] =
    await sql`insert into talent_profiles (user_id, slug, headline, bio, website_url, is_published)
    values (${TALENT}, 'apply-talent', 'Dev', 'I build integrations that survive production.',
            'https://example.com/t', true) returning id`;
  const [c] =
    await sql`insert into client_profiles (user_id, company_name) values (${CLIENT}, 'ClientCo') returning id`;
  const [j] =
    await sql`insert into jobs (client_id, title, slug, description, engagement_type, status, published_at)
    values (${c!.id}, 'Open role', 'apply-open-role', 'desc', 'fixed', 'open', now()) returning id`;
  const [cj] =
    await sql`insert into jobs (client_id, title, slug, description, engagement_type, status, published_at)
    values (${c!.id}, 'Closed role', 'apply-closed-role', 'desc', 'fixed', 'closed', now()) returning id`;

  ids = { talent: t!.id, client: c!.id, job: j!.id, closedJob: cj!.id };
}

afterAll(async () => {
  if (reachable) await sql`delete from auth.users where id in (${TALENT}, ${CLIENT}, ${OTHER})`;
  await sql.end();
});

const maybe = reachable ? describe : describe.skip;

maybe('applying', () => {
  beforeEach(reset);

  it('lets a talent apply to an open job', async () => {
    const rows = await asUser(
      TALENT,
      (tx) =>
        tx`insert into applications (job_id, talent_id, cover_note)
         values (${ids.job}, ${ids.talent}, ${'x'.repeat(60)}) returning id`,
    );
    expect(rows).toHaveLength(1);
  });

  it('refuses a SECOND application to the same job', async () => {
    await asUser(
      TALENT,
      (tx) =>
        tx`insert into applications (job_id, talent_id, cover_note) values (${ids.job}, ${ids.talent}, 'first')`,
    );
    // The constraint, not a check-then-insert — a check would race with a double-click.
    await expect(
      asUser(
        TALENT,
        (tx) =>
          tx`insert into applications (job_id, talent_id, cover_note) values (${ids.job}, ${ids.talent}, 'second')`,
      ),
    ).rejects.toThrow(/applications_job_talent_unique/);
  });

  it('refuses an application to a job that is not open', async () => {
    await expect(
      asUser(
        TALENT,
        (tx) =>
          tx`insert into applications (job_id, talent_id, cover_note) values (${ids.closedJob}, ${ids.talent}, 'hi')`,
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('refuses an application filed on another talent’s behalf', async () => {
    await expect(
      asUser(
        OTHER,
        (tx) =>
          tx`insert into applications (job_id, talent_id, cover_note) values (${ids.job}, ${ids.talent}, 'not mine')`,
      ),
    ).rejects.toThrow(/row-level security/i);
  });
});

maybe('who can see an application', () => {
  beforeEach(async () => {
    await reset();
    await sql`insert into applications (job_id, talent_id, cover_note) values (${ids.job}, ${ids.talent}, 'note')`;
  });

  it('is visible to the applicant and to the job owner', async () => {
    for (const who of [TALENT, CLIENT]) {
      const rows = await asUser(
        who,
        (tx) => tx`select id from applications where job_id = ${ids.job}`,
      );
      expect(rows).toHaveLength(1);
    }
  });

  it('is invisible to anyone else — fails closed, returning no rows', async () => {
    const rows = await asUser(OTHER, (tx) => tx`select id from applications`);
    expect(rows).toHaveLength(0);
  });
});

maybe('status transitions', () => {
  beforeEach(reset);

  it('writes an audit row for every change, from the trigger not the caller', async () => {
    const [app] = await sql`insert into applications (job_id, talent_id, cover_note)
      values (${ids.job}, ${ids.talent}, 'note') returning id`;
    await sql`update applications set status = 'viewed' where id = ${app!.id}`;
    await sql`update applications set status = 'shortlisted' where id = ${app!.id}`;

    const events = await sql`select from_status, to_status from application_events
                             where application_id = ${app!.id} order by at`;
    expect(events).toHaveLength(3); // insert + two changes
    expect(events.at(-1)!.to_status).toBe('shortlisted');
  });

  it('the transition table matches what the UI offers', () => {
    // The candidate list renders buttons straight from this table, so a mismatch would mean
    // offering an action the server refuses.
    expect(allowedStatusTransitions.client.applied).toContain('shortlisted');
    expect(allowedStatusTransitions.client.applied).not.toContain('hired');
    expect(allowedStatusTransitions.client.rejected).toHaveLength(0);
    expect(allowedStatusTransitions.talent.applied).toEqual(['withdrawn']);
  });

  it('does not let a withdrawn application be resurrected', () => {
    expect(allowedStatusTransitions.talent.withdrawn).toHaveLength(0);
    expect(allowedStatusTransitions.client.withdrawn).toHaveLength(0);
  });
});
