/**
 * Applicant ranking.
 *
 * The property worth protecting: an applicant with no cached ranking is UNMEASURED, not poor.
 * Usually they applied since the last warm. Sorting them as though they scored zero would be
 * a verdict the system has not earned, delivered silently by a comparator.
 *
 * Tested against the database because ordering comes from `match_cache`, and a mocked cache
 * would only prove the sort function sorts.
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

const JOB = '6a6a6a6a-6a6a-46a6-86a6-6a6a6a6a6a6a';
const BEST = '7b7b7b7b-7b7b-47b7-87b7-7b7b7b7b7b7b';
const WORST = '8c8c8c8c-8c8c-48c8-88c8-8c8c8c8c8c8c';
const UNRANKED = '9d9d9d9d-9d9d-49d9-89d9-9d9d9d9d9d9d';

const future = () => new Date(Date.now() + 3_600_000).toISOString();

async function reset() {
  await sql`delete from match_cache where subject_id = ${JOB}`;
  await sql`insert into match_cache (subject_type, subject_id, target_id, score, reason, expires_at)
            values ('job', ${JOB}, ${BEST}, 90, 'Has shipped exactly this.', ${future()})`;
  await sql`insert into match_cache (subject_type, subject_id, target_id, score, reason, expires_at)
            values ('job', ${JOB}, ${WORST}, 30, 'Adjacent only.', ${future()})`;
}

/** The read and ordering rankApplicants performs. */
async function rank(applicantIds: string[]) {
  const cached = await sql`
    select target_id, score, reason from match_cache
    where subject_type = 'job' and subject_id = ${JOB} and expires_at > now()
    order by score desc`;

  const order = new Map(cached.map((c, i) => [c.target_id as string, i]));
  const reasons = new Map(cached.map((c) => [c.target_id as string, c.reason as string | null]));

  return applicantIds
    .map((id) => ({ id, reason: reasons.get(id) ?? null, ranked: order.has(id) }))
    .sort((a, b) => {
      const ra = order.get(a.id);
      const rb = order.get(b.id);
      if (ra === undefined && rb === undefined) return 0;
      if (ra === undefined) return 1;
      if (rb === undefined) return -1;
      return ra - rb;
    });
}

afterAll(async () => {
  if (reachable) await sql`delete from match_cache where subject_id = ${JOB}`;
  await sql.end();
});

itAnnouncesTarget(sql, DB_URL);

const maybe = reachable ? describe : describe.skip;

maybe('rankApplicants', () => {
  beforeEach(reset);

  it('puts the best fit first', async () => {
    const result = await rank([WORST, BEST]);
    expect(result.map((r) => r.id)).toEqual([BEST, WORST]);
  });

  it('attaches the reason to each ranked applicant', async () => {
    const result = await rank([BEST]);
    expect(result[0]!.reason).toBe('Has shipped exactly this.');
  });

  it('PUTS AN UNRANKED APPLICANT LAST, NOT AS A ZERO', async () => {
    // The distinction that matters. Unmeasured is not poor — and the flag is what lets the
    // page say so rather than implying a verdict by position alone.
    const result = await rank([UNRANKED, WORST, BEST]);
    expect(result.map((r) => r.id)).toEqual([BEST, WORST, UNRANKED]);
    expect(result.find((r) => r.id === UNRANKED)!.ranked).toBe(false);
    expect(result.find((r) => r.id === WORST)!.ranked).toBe(true);
  });

  it('keeps unranked applicants in their incoming order', async () => {
    // Two unmeasured applicants have no basis for being ordered against each other, so the
    // sort must not invent one.
    const a = '11111111-1111-4111-8111-111111111111';
    const b = '22222222-2222-4222-8222-222222222222';
    const result = await rank([a, b]);
    expect(result.map((r) => r.id)).toEqual([a, b]);
  });

  it('marks everyone unranked when the cache is cold', async () => {
    await sql`delete from match_cache where subject_id = ${JOB}`;
    const result = await rank([BEST, WORST]);
    expect(result.every((r) => !r.ranked)).toBe(true);
    expect(result.every((r) => r.reason === null)).toBe(true);
  });

  it('IGNORES AN EXPIRED RANKING rather than serving a stale order', async () => {
    await sql`update match_cache set expires_at = now() - interval '1 second' where subject_id = ${JOB}`;
    const result = await rank([BEST, WORST]);
    expect(result.every((r) => !r.ranked)).toBe(true);
  });
});
