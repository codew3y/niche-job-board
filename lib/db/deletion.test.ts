/**
 * Account deletion — proves the promises in docs/constraints.md §5 and flows §11.
 *
 * Deletion is the one operation that cannot be fixed after the fact: if it silently leaves
 * data behind, nobody notices until it matters legally. And if it cascades too far, it
 * destroys the counterparty's record of a conversation they are entitled to keep.
 *
 * The commitments under test:
 *   1. Deleting an account REMOVES the user's own data — profile, items, applications,
 *      saved lists, notifications, blocks, and the embeddings derived from their bio.
 *   2. It does NOT destroy the counterparty's copy of a shared conversation. The sender is
 *      tombstoned and the body redacted; the thread survives.
 *   3. It does not fail. Before migration 0002 every deletion died on a foreign-key
 *      violation, which meant the product could not honour a deletion request at all.
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

const reachable = await sql`select current_database()`.then(
  () => {
    // Announce the target. Reporting 'green' without saying WHICH database was
    // measured is how a hosted verification silently becomes a local one.
    console.info(`[deletion.test] connected to ${DB_URL.replace(/:[^:@]+@/, ':****@')}`);
    return true;
  },
  (e: Error) => {
    console.warn(`[deletion.test] skipping — cannot reach ${DB_URL}: ${e.message}`);
    return false;
  },
);

const LEAVER = '44444444-4444-4444-4444-444444444444'; // deletes their account
const STAYER = '55555555-5555-5555-5555-555555555555'; // keeps theirs

type Fixture = {
  talentId: string;
  clientId: string;
  jobId: string;
  conversationId: string;
  leaverMessageId: string;
  stayerMessageId: string;
};

async function makeUser(id: string, email: string) {
  await sql`
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                            created_at, updated_at)
    values (${id}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            ${email}, 'x', now(), now())`;
  await sql`insert into user_profiles (user_id, display_name) values (${id}, ${email})`;
}

async function cleanup() {
  await sql`delete from auth.users where id in (${LEAVER}, ${STAYER})`;
  await sql`delete from conversations where client_id is null and talent_id is null`;
}

/** LEAVER is the talent, STAYER is the client. They have a live conversation. */
async function buildFixture(): Promise<Fixture> {
  await cleanup();
  await makeUser(LEAVER, 'leaver@example.test');
  await makeUser(STAYER, 'stayer@example.test');

  const [talent] = await sql`
    insert into talent_profiles (user_id, slug, headline, bio, website_url, is_published,
                                 embedding)
    values (${LEAVER}, 'leaver', 'Leaving dev', 'I build things.',
            'https://example.com/leaver', true, ${'[' + Array(1536).fill(0.1).join(',') + ']'})
    returning id`;

  const [client] = await sql`
    insert into client_profiles (user_id, company_name) values (${STAYER}, 'Stayer Ltd')
    returning id`;

  const [job] = await sql`
    insert into jobs (client_id, title, slug, description, engagement_type, status, published_at)
    values (${client!.id}, 'A role', 'a-role-deletion-test', 'desc', 'fixed', 'open', now())
    returning id`;

  await sql`
    insert into portfolio_items (talent_id, title, description)
    values (${talent!.id}, 'A project', 'Did a thing.')`;

  await sql`
    insert into applications (job_id, talent_id, cover_note)
    values (${job!.id}, ${talent!.id}, 'Interested.')`;

  await sql`insert into saved_jobs (talent_id, job_id) values (${talent!.id}, ${job!.id})`;
  await sql`insert into notifications (user_id, type, dedupe_key)
            values (${LEAVER}, 'strong_match', 'deletion-test-key')`;
  await sql`insert into blocks (blocker_id, blocked_id) values (${LEAVER}, ${STAYER})`;

  const [conv] = await sql`
    insert into conversations (client_id, talent_id, job_id)
    values (${client!.id}, ${talent!.id}, ${job!.id}) returning id`;

  const [m1] = await sql`
    insert into messages (conversation_id, sender_id, body)
    values (${conv!.id}, ${LEAVER}, 'Hello, I am interested in this role.') returning id`;
  const [m2] = await sql`
    insert into messages (conversation_id, sender_id, body)
    values (${conv!.id}, ${STAYER}, 'Great — can you start in March?') returning id`;

  return {
    talentId: talent!.id,
    clientId: client!.id,
    jobId: job!.id,
    conversationId: conv!.id,
    leaverMessageId: m1!.id,
    stayerMessageId: m2!.id,
  };
}

afterAll(async () => {
  if (reachable) await cleanup();
  await sql.end();
});

const maybe = reachable ? describe : describe.skip;

maybe('account deletion', () => {
  let fx: Fixture;
  beforeEach(async () => {
    fx = await buildFixture();
  });

  it('succeeds at all', async () => {
    // Before migration 0002 this threw a foreign-key violation every time, which meant a
    // deletion request simply could not be honoured.
    await expect(sql`delete from auth.users where id = ${LEAVER}`).resolves.toBeDefined();
    const [u] = await sql`select count(*)::int as n from auth.users where id = ${LEAVER}`;
    expect(u!.n).toBe(0);
  });

  it('removes everything the leaver owned, including derived embeddings', async () => {
    await sql`delete from auth.users where id = ${LEAVER}`;

    const gone = async (q: postgres.PendingQuery<postgres.Row[]>) => {
      const [r] = await q;
      return Number(r!.n);
    };

    expect(await gone(sql`select count(*)::int as n from talent_profiles where user_id = ${LEAVER}`)).toBe(0);
    expect(await gone(sql`select count(*)::int as n from portfolio_items where talent_id = ${fx.talentId}`)).toBe(0);
    expect(await gone(sql`select count(*)::int as n from applications where talent_id = ${fx.talentId}`)).toBe(0);
    expect(await gone(sql`select count(*)::int as n from saved_jobs where talent_id = ${fx.talentId}`)).toBe(0);
    expect(await gone(sql`select count(*)::int as n from notifications where user_id = ${LEAVER}`)).toBe(0);
    expect(await gone(sql`select count(*)::int as n from blocks where blocker_id = ${LEAVER}`)).toBe(0);
    expect(await gone(sql`select count(*)::int as n from user_profiles where user_id = ${LEAVER}`)).toBe(0);

    // The embedding lived on talent_profiles, so it goes with the row. An orphaned
    // vector(1536) derived from someone's bio is still their personal data.
    const [emb] = await sql`
      select count(*)::int as n from talent_profiles where embedding is not null and user_id = ${LEAVER}`;
    expect(emb!.n).toBe(0);
  });

  it('leaves the counterparty their copy of the conversation', async () => {
    await sql`delete from auth.users where id = ${LEAVER}`;

    const [conv] = await sql`
      select client_id, talent_id from conversations where id = ${fx.conversationId}`;
    expect(conv).toBeDefined();
    expect(conv!.talent_id).toBeNull(); // tombstoned
    expect(conv!.client_id).toBe(fx.clientId); // the stayer keeps their side

    const msgs = await sql`
      select id, sender_id, body, redacted_reason from messages
      where conversation_id = ${fx.conversationId} order by created_at`;
    expect(msgs).toHaveLength(2);
  });

  it('redacts the leaver’s messages but keeps the stayer’s intact', async () => {
    await sql`delete from auth.users where id = ${LEAVER}`;

    const [left] = await sql`select sender_id, body, redacted_reason from messages where id = ${fx.leaverMessageId}`;
    expect(left!.sender_id).toBeNull();
    expect(left!.body).toBe('[message removed — account deleted]');
    expect(left!.redacted_reason).toBe('account_deleted');

    const [kept] = await sql`select sender_id, body, redacted_reason from messages where id = ${fx.stayerMessageId}`;
    expect(kept!.sender_id).toBe(STAYER);
    expect(kept!.body).toBe('Great — can you start in March?');
    expect(kept!.redacted_reason).toBeNull();
  });

  it('does not touch the other party’s own data', async () => {
    await sql`delete from auth.users where id = ${LEAVER}`;

    const [client] = await sql`select count(*)::int as n from client_profiles where id = ${fx.clientId}`;
    expect(client!.n).toBe(1);
    const [job] = await sql`select count(*)::int as n from jobs where id = ${fx.jobId}`;
    expect(job!.n).toBe(1);
  });

  it('survives both parties leaving, without orphaning a readable thread', async () => {
    await sql`delete from auth.users where id = ${LEAVER}`;
    await sql`delete from auth.users where id = ${STAYER}`;

    const [conv] = await sql`
      select client_id, talent_id from conversations where id = ${fx.conversationId}`;
    // Both sides tombstoned. The row still exists, but no policy can ever match it, so it is
    // unreachable by any user. A housekeeping sweep should collect these — tracked below.
    expect(conv!.client_id).toBeNull();
    expect(conv!.talent_id).toBeNull();

    const orphans = await sql`
      select count(*)::int as n from conversations where client_id is null and talent_id is null`;
    expect(Number(orphans[0]!.n)).toBeGreaterThan(0);
  });

  it('is idempotent — deleting twice is not an error', async () => {
    await sql`delete from auth.users where id = ${LEAVER}`;
    await expect(sql`delete from auth.users where id = ${LEAVER}`).resolves.toBeDefined();
  });
});
