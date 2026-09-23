/**
 * Retrieval: hard filters before vector search.
 *
 * Tested in SQL against the real functions, because the property under test is the ORDER of
 * operations inside Postgres. A test that mocked the RPC would assert that TypeScript passes
 * arguments, which is not the thing that can be wrong.
 *
 * The embeddings here are hand-built unit vectors rather than model output. That is
 * deliberate: it makes "which candidate is nearest" arithmetic rather than a property of a
 * remote model, so a failure means the query is wrong and never that the model had a bad day.
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

const CLIENT = 'c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1';
const NEAR = 'd1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1';
const FAR = 'e2e2e2e2-e2e2-4e2e-8e2e-e2e2e2e2e2e2';
const UNAVAILABLE = 'f3f3f3f3-f3f3-4f3f-8f3f-f3f3f3f3f3f3';
const DRAFT = '04040404-0404-4040-8040-040404040404';

/** A 1536-dim unit vector pointing along one axis. Distances become obvious by construction. */
function axisVector(axis: number): string {
  const values = new Array(1536).fill(0);
  values[axis] = 1;
  return `[${values.join(',')}]`;
}

const QUERY = axisVector(0);
let ids = { client: '', near: '', far: '', unavailable: '', openJob: '', closedJob: '' };

async function mkUser(id: string, email: string) {
  await sql`insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
            values (${id}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', ${email}, 'x', now(), now())`;
  await sql`insert into user_profiles (user_id, display_name) values (${id}, ${email})`;
}

const BIO = 'b'.repeat(200);

async function reset() {
  await sql`delete from auth.users where id in (${CLIENT}, ${NEAR}, ${FAR}, ${UNAVAILABLE}, ${DRAFT})`;
  for (const [id, email] of [
    [CLIENT, 'ret-client@example.test'],
    [NEAR, 'ret-near@example.test'],
    [FAR, 'ret-far@example.test'],
    [UNAVAILABLE, 'ret-unavailable@example.test'],
    [DRAFT, 'ret-draft@example.test'],
  ] as const) {
    await mkUser(id, email);
  }

  const [c] =
    await sql`insert into client_profiles (user_id, company_name) values (${CLIENT}, 'Retrieval Co') returning id`;

  // NEAR sits exactly on the query axis; FAR is orthogonal to it.
  const mkTalent = async (
    user: string,
    slug: string,
    axis: number,
    published: boolean,
    availability: string,
  ) => {
    const [row] = await sql`
      insert into talent_profiles (user_id, slug, headline, bio, website_url, is_published, availability, embedding)
      values (${user}, ${slug}, 'Dev', ${BIO}, 'https://e.test/x', ${published}, ${availability}::availability, ${axisVector(axis)}::vector)
      returning id`;
    return row!.id as string;
  };

  const near = await mkTalent(NEAR, 'ret-near', 0, true, 'part_time');
  const far = await mkTalent(FAR, 'ret-far', 5, true, 'part_time');
  const unavailable = await mkTalent(UNAVAILABLE, 'ret-unavailable', 0, true, 'unavailable');
  // Unpublished, and sitting exactly on the query axis — the strongest possible vector match.
  await mkTalent(DRAFT, 'ret-draft', 0, false, 'part_time');

  const [openJob] = await sql`
    insert into jobs (client_id, title, slug, description, engagement_type, status, published_at, embedding)
    values (${c!.id}, 'Open role', 'ret-open', 'desc', 'fixed', 'open', now(), ${axisVector(0)}::vector)
    returning id`;
  const [closedJob] = await sql`
    insert into jobs (client_id, title, slug, description, engagement_type, status, published_at, embedding)
    values (${c!.id}, 'Closed role', 'ret-closed', 'desc', 'fixed', 'closed', now(), ${axisVector(0)}::vector)
    returning id`;

  ids = {
    client: c!.id,
    near,
    far,
    unavailable,
    openJob: openJob!.id,
    closedJob: closedJob!.id,
  };
}

afterAll(async () => {
  if (reachable)
    await sql`delete from auth.users where id in (${CLIENT}, ${NEAR}, ${FAR}, ${UNAVAILABLE}, ${DRAFT})`;
  await sql.end();
});

itAnnouncesTarget(sql, DB_URL);

const maybe = reachable ? describe : describe.skip;

const talentFor = (limit = 20, exclude: string[] = []) =>
  sql`select * from match_talent_for_job(${QUERY}::vector, ${limit}, ${exclude}::uuid[])`;

maybe('match_talent_for_job', () => {
  beforeEach(reset);

  it('ranks the nearest vector first, and reports similarity as higher-is-better', async () => {
    const rows = await talentFor();
    expect(rows[0]!.id).toBe(ids.near);
    // Identical vectors: cosine distance 0, so similarity 1.
    expect(Number(rows[0]!.similarity)).toBeCloseTo(1, 5);
  });

  it('reports an orthogonal vector as similarity 0', async () => {
    /**
     * Asked directly rather than looked for in the top 20.
     *
     * The original version searched the result set for this fixture and passed only while the
     * database was empty. Once the backfill embedded 43 real profiles, every one of them
     * outranked a vector orthogonal to the query and the fixture fell off the page — a test
     * that silently depended on the rest of the database.
     */
    const [row] = await sql`
      select 1 - (embedding <=> ${QUERY}::vector) as similarity
      from talent_profiles where id = ${ids.far}`;
    expect(Number(row!.similarity)).toBeCloseTo(0, 5);
  });

  it('EXCLUDES AN UNPUBLISHED PROFILE even though it is the closest possible match', async () => {
    const [draft] = await sql`select id from talent_profiles where slug = 'ret-draft'`;

    // First establish that it WOULD rank first: it sits exactly on the query axis, so its
    // similarity is 1 and nothing can beat it. Absence is only evidence of filtering if the
    // row would otherwise have been there.
    const [similarity] = await sql`
      select 1 - (embedding <=> ${QUERY}::vector) as s from talent_profiles where id = ${draft!.id}`;
    expect(Number(similarity!.s)).toBeCloseTo(1, 5);

    const rows = await talentFor();
    expect(rows.map((r) => r.id)).not.toContain(draft!.id);
  });

  it('EXCLUDES AN UNAVAILABLE PROFILE, also a perfect vector match', async () => {
    const rows = await talentFor();
    expect(rows.map((r) => r.id)).not.toContain(ids.unavailable);
  });

  it('honours the exclude list', async () => {
    const rows = await talentFor(20, [ids.near]);
    expect(rows.map((r) => r.id)).not.toContain(ids.near);
  });

  it('honours the limit', async () => {
    const rows = await talentFor(1);
    expect(rows).toHaveLength(1);
  });

  it('skips profiles with no embedding rather than ranking them arbitrarily', async () => {
    await sql`update talent_profiles set embedding = null where id = ${ids.near}`;
    const rows = await talentFor();
    expect(rows.map((r) => r.id)).not.toContain(ids.near);
  });
});

maybe('match_jobs_for_talent', () => {
  beforeEach(reset);

  const jobsFor = (talent: string) =>
    sql`select * from match_jobs_for_talent(${QUERY}::vector, ${talent}::uuid, 20)`;

  it('returns open jobs, nearest first', async () => {
    const rows = await jobsFor(ids.near);
    expect(rows.map((r) => r.id)).toContain(ids.openJob);
  });

  it('EXCLUDES A CLOSED JOB, however well it matches', async () => {
    const rows = await jobsFor(ids.near);
    expect(rows.map((r) => r.id)).not.toContain(ids.closedJob);
  });

  it('EXCLUDES A JOB ALREADY APPLIED TO', async () => {
    // A feed that keeps recommending jobs you have applied to reads as broken, even though
    // every row in it is a genuine match.
    await sql`insert into applications (job_id, talent_id, cover_note) values (${ids.openJob}, ${ids.near}, ${'c'.repeat(60)})`;
    const rows = await jobsFor(ids.near);
    expect(rows.map((r) => r.id)).not.toContain(ids.openJob);
  });

  it('excludes a job whose deadline has passed', async () => {
    await sql`update jobs set deadline = current_date - 1 where id = ${ids.openJob}`;
    const rows = await jobsFor(ids.near);
    expect(rows.map((r) => r.id)).not.toContain(ids.openJob);
  });

  it('keeps a job with no deadline', async () => {
    await sql`update jobs set deadline = null where id = ${ids.openJob}`;
    const rows = await jobsFor(ids.near);
    expect(rows.map((r) => r.id)).toContain(ids.openJob);
  });
});

maybe('the match functions are not reachable by ordinary users', () => {
  it('ANON AND AUTHENTICATED CANNOT EXECUTE THEM', async () => {
    // These return every published profile ranked by similarity, which is the raw material of
    // a score. ADR-007 D2 keeps that server-side.
    for (const role of ['anon', 'authenticated']) {
      await expect(
        sql.begin(async (tx) => {
          await tx.unsafe(`SET LOCAL ROLE ${role}`);
          return tx`select * from match_talent_for_job(${QUERY}::vector, 5, '{}'::uuid[])`;
        }),
      ).rejects.toThrow(/permission denied/i);
    }
  });

  it('service_role can', async () => {
    const rows = await sql.begin(async (tx) => {
      await tx.unsafe('SET LOCAL ROLE service_role');
      return tx`select * from match_talent_for_job(${QUERY}::vector, 5, '{}'::uuid[])`;
    });
    expect(Array.isArray(rows)).toBe(true);
  });
});
