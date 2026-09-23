/**
 * match_cache semantics.
 *
 * Three properties, each of which fails silently when wrong: expiry is enforced in SQL,
 * invalidation reaches BOTH directions, and a replacement is wholesale rather than a merge.
 * All three are database behaviour, so they are tested against the database.
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

const SUBJECT = '26262626-2626-4262-8262-262626262626';
const TARGET_A = '37373737-3737-4373-8373-373737373737';
const TARGET_B = '48484848-4848-4484-8484-484848484848';
const OTHER = '59595959-5959-4595-8595-595959595959';

const future = () => new Date(Date.now() + 3_600_000).toISOString();
const past = () => new Date(Date.now() - 1_000).toISOString();

async function reset() {
  await sql`delete from match_cache where subject_id in (${SUBJECT}, ${OTHER}) or target_id in (${TARGET_A}, ${TARGET_B}, ${SUBJECT})`;
}

const put = (subject: string, target: string, score: number, expires: string) => sql`
  insert into match_cache (subject_type, subject_id, target_id, score, reason, expires_at)
  values ('job', ${subject}, ${target}, ${score}, 'because', ${expires})`;

/** Exactly the read lib/matching/cache.ts issues. */
const read = (subject: string) => sql`
  select target_id, score from match_cache
  where subject_type = 'job' and subject_id = ${subject} and expires_at > now()
  order by score desc`;

afterAll(async () => {
  if (reachable) await reset();
  await sql.end();
});

itAnnouncesTarget(sql, DB_URL);

const maybe = reachable ? describe : describe.skip;

maybe('reading', () => {
  beforeEach(reset);

  it('returns rows highest score first', async () => {
    await put(SUBJECT, TARGET_A, 60, future());
    await put(SUBJECT, TARGET_B, 90, future());
    const rows = await read(SUBJECT);
    expect(rows.map((r) => r.target_id)).toEqual([TARGET_B, TARGET_A]);
  });

  it('EXPIRY IS ENFORCED IN THE QUERY, not in JavaScript', async () => {
    // A row that expired a second ago must not be served because a process clock drifted.
    await put(SUBJECT, TARGET_A, 90, past());
    expect(await read(SUBJECT)).toHaveLength(0);
  });

  it('does not leak another subject’s ranking', async () => {
    await put(OTHER, TARGET_A, 90, future());
    expect(await read(SUBJECT)).toHaveLength(0);
  });
});

maybe('writing', () => {
  beforeEach(reset);

  it('REPLACES WHOLESALE rather than merging', async () => {
    // If the previous ranking held a candidate the new one does not — they unpublished, or
    // were filtered out — an upsert would leave that row behind and keep serving it.
    await put(SUBJECT, TARGET_A, 90, future());
    await sql`delete from match_cache where subject_type = 'job' and subject_id = ${SUBJECT}`;
    await put(SUBJECT, TARGET_B, 70, future());
    const rows = await read(SUBJECT);
    expect(rows.map((r) => r.target_id)).toEqual([TARGET_B]);
  });

  it('refuses a score outside 0-100', async () => {
    await expect(put(SUBJECT, TARGET_A, 150, future())).rejects.toThrow(/match_cache_score_range/);
    await expect(put(SUBJECT, TARGET_A, -1, future())).rejects.toThrow(/match_cache_score_range/);
  });

  it('refuses a subject type outside talent and job', async () => {
    await expect(
      sql`insert into match_cache (subject_type, subject_id, target_id, score, expires_at)
          values ('client', ${SUBJECT}, ${TARGET_A}, 50, ${future()})`,
    ).rejects.toThrow(/match_cache_subject_type/);
  });

  it('cannot hold the same subject-target pair twice', async () => {
    await put(SUBJECT, TARGET_A, 50, future());
    await expect(put(SUBJECT, TARGET_A, 90, future())).rejects.toThrow(
      /duplicate key|match_cache_subject_target_unique/,
    );
  });
});

maybe('invalidation', () => {
  beforeEach(reset);

  it('CLEARS BOTH DIRECTIONS', async () => {
    // Editing a job makes two things stale: the ranking OF candidates for it, and every
    // ranking that listed it as a candidate. Clearing only the first leaves a developer's
    // feed recommending a job on the strength of text that no longer exists.
    await put(SUBJECT, TARGET_A, 90, future());
    await put(OTHER, SUBJECT, 80, future());

    await sql`delete from match_cache where subject_type = 'job' and subject_id = ${SUBJECT}`;
    await sql`delete from match_cache where target_id = ${SUBJECT}`;

    const asSubject = await sql`select * from match_cache where subject_id = ${SUBJECT}`;
    const asTarget = await sql`select * from match_cache where target_id = ${SUBJECT}`;
    expect(asSubject).toHaveLength(0);
    expect(asTarget).toHaveLength(0);
  });

  it('leaves unrelated rankings alone', async () => {
    await put(OTHER, TARGET_B, 75, future());
    await sql`delete from match_cache where subject_type = 'job' and subject_id = ${SUBJECT}`;
    await sql`delete from match_cache where target_id = ${SUBJECT}`;
    expect(await read(OTHER)).toHaveLength(1);
  });
});

maybe('the sweep', () => {
  beforeEach(reset);

  it('removes expired rows and keeps live ones', async () => {
    await put(SUBJECT, TARGET_A, 90, past());
    await put(SUBJECT, TARGET_B, 80, future());
    await sql`delete from match_cache where expires_at < now()`;
    const rows = await sql`select target_id from match_cache where subject_id = ${SUBJECT}`;
    expect(rows.map((r) => r.target_id)).toEqual([TARGET_B]);
  });
});

maybe('exposure', () => {
  beforeEach(reset);

  it('IS UNREADABLE BY AUTHENTICATED USERS — the score never reaches a client (ADR-007 D2)', async () => {
    await put(SUBJECT, TARGET_A, 90, future());
    const rows = await sql.begin(async (tx) => {
      await tx.unsafe('SET LOCAL ROLE authenticated');
      await tx`select set_config('request.jwt.claim.sub', ${SUBJECT}, true)`;
      return tx`select * from match_cache`;
    });
    expect(rows).toHaveLength(0);
  });
});
