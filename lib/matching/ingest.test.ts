/**
 * Ingest bookkeeping: the dead-letter table and staleness.
 *
 * The embedding CALL is covered end-to-end by `npm run embed:backfill` against real data —
 * mocking a remote model here would test the mock. What these assert is the bookkeeping that
 * decides whether a failure is visible and whether a stale row gets re-embedded, both of which
 * are pure database behaviour and both of which fail silently when wrong.
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

const OWNER = '15151515-1515-4151-8151-151515151515';
let talentId = '';

const BIO = 'I rebuild billing systems that have outgrown their first implementation. '.repeat(3);

async function reset() {
  await sql`delete from auth.users where id = ${OWNER}`;
  await sql`insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
            values (${OWNER}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ingest@example.test', 'x', now(), now())`;
  await sql`insert into user_profiles (user_id, display_name) values (${OWNER}, 'Ingest')`;
  const [p] = await sql`
    insert into talent_profiles (user_id, slug, headline, bio, website_url, is_published)
    values (${OWNER}, 'ingest-test', 'Billing developer', ${BIO}, 'https://e.test/i', true)
    returning id`;
  talentId = p!.id as string;
}

afterAll(async () => {
  if (reachable) await sql`delete from auth.users where id = ${OWNER}`;
  await sql.end();
});

itAnnouncesTarget(sql, DB_URL);

const maybe = reachable ? describe : describe.skip;

/** Exactly the upsert lib/matching/ingest.ts issues on failure. */
const recordFailure = (id: string, detail: string, attempts: number) => sql`
  insert into embedding_failures (entity_type, entity_id, attempts, last_error, last_failed_at)
  values ('talent_profile', ${id}, ${attempts}, ${detail}, now())
  on conflict (entity_type, entity_id) do update
    set attempts = excluded.attempts, last_error = excluded.last_error, last_failed_at = now()`;

maybe('embedding_failures — one row per broken entity, not one per attempt', () => {
  beforeEach(async () => {
    await reset();
    await sql`delete from embedding_failures where entity_id = ${talentId}`;
  });

  it('records a failure', async () => {
    await recordFailure(talentId, '429 rate limited', 4);
    const rows = await sql`select * from embedding_failures where entity_id = ${talentId}`;
    expect(rows).toHaveLength(1);
    expect(rows[0]!.attempts).toBe(4);
  });

  it('A SECOND FAILURE UPDATES RATHER THAN APPENDING', async () => {
    // A dead-letter table that grows per retry is a log, and nobody reads a log to find out
    // what is currently broken.
    await recordFailure(talentId, 'first', 4);
    await recordFailure(talentId, 'second', 8);
    const rows = await sql`select * from embedding_failures where entity_id = ${talentId}`;
    expect(rows).toHaveLength(1);
    expect(rows[0]!.last_error).toBe('second');
    expect(rows[0]!.attempts).toBe(8);
  });

  it('keeps first_failed_at while moving last_failed_at', async () => {
    await recordFailure(talentId, 'first', 1);
    const [before] =
      await sql`select first_failed_at from embedding_failures where entity_id = ${talentId}`;
    await recordFailure(talentId, 'again', 2);
    const [after] =
      await sql`select first_failed_at from embedding_failures where entity_id = ${talentId}`;
    // How long something has been broken is the question this table answers.
    expect(new Date(after!.first_failed_at).getTime()).toBe(
      new Date(before!.first_failed_at).getTime(),
    );
  });

  it('a success clears the row, so the table only holds what is still broken', async () => {
    await recordFailure(talentId, 'transient', 2);
    await sql`delete from embedding_failures where entity_type = 'talent_profile' and entity_id = ${talentId}`;
    const rows = await sql`select * from embedding_failures where entity_id = ${talentId}`;
    expect(rows).toHaveLength(0);
  });

  it('refuses an entity type outside the three that can be embedded', async () => {
    await expect(
      sql`insert into embedding_failures (entity_type, entity_id) values ('client_profile', ${talentId})`,
    ).rejects.toThrow(/embedding_failures_entity_type/);
  });

  it('IS NOT READABLE BY ORDINARY USERS', async () => {
    // It names entities and carries raw provider errors. RLS is on with no policy, so there
    // is no path to it but the service role.
    await recordFailure(talentId, 'sensitive detail', 1);
    const rows = await sql.begin(async (tx) => {
      await tx.unsafe('SET LOCAL ROLE authenticated');
      await tx`select set_config('request.jwt.claim.sub', ${OWNER}, true)`;
      return tx`select * from embedding_failures`;
    });
    expect(rows).toHaveLength(0);
  });
});

maybe('staleness — what the backfill re-embeds', () => {
  beforeEach(reset);

  it('treats a never-embedded row as stale', async () => {
    const rows = await sql`
      select id from talent_profiles
      where id = ${talentId} and (embedding is null or embedding_updated_at is null
        or embedding_updated_at < updated_at)`;
    expect(rows).toHaveLength(1);
  });

  it('TREATS A ROW EDITED AFTER EMBEDDING AS STALE', async () => {
    // The case that matters: a profile whose text changed still carries the old vector and
    // would keep matching on what it used to say.
    await sql`update talent_profiles set embedding_updated_at = now() where id = ${talentId}`;
    await sql`update talent_profiles set headline = 'Changed headline' where id = ${talentId}`;
    const rows = await sql`
      select id from talent_profiles
      where id = ${talentId} and (embedding is null or embedding_updated_at is null
        or embedding_updated_at < updated_at)`;
    expect(rows).toHaveLength(1);
  });

  it('leaves a freshly embedded, unedited row alone', async () => {
    await sql`update talent_profiles set headline = 'Settled' where id = ${talentId}`;
    // The embedding itself has to be present, not just the timestamp — the staleness clause
    // has three branches and `embedding is null` is the first. Setting only the timestamp
    // left this row stale via a different branch than the one under test, which is how the
    // first version of this test passed for the wrong reason.
    const zeroVector = `[${new Array(1536).fill(0).join(',')}]`;
    await sql`update talent_profiles
              set embedding = ${zeroVector}::vector,
                  embedding_updated_at = now() + interval '1 second'
              where id = ${talentId}`;
    const rows = await sql`
      select id from talent_profiles
      where id = ${talentId} and (embedding is null or embedding_updated_at is null
        or embedding_updated_at < updated_at)`;
    expect(rows).toHaveLength(0);
  });
});
