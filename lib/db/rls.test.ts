/**
 * RLS cross-tenant tests — Phase 1 exit criterion (PROJECT.md §5.5, DoD §2).
 *
 * These run against a REAL Postgres with the real Supabase auth schema and the real
 * `anon` / `authenticated` roles. A mock would prove nothing: RLS is enforced by the
 * database, so testing it anywhere else tests the mock.
 *
 * The contract every test here asserts is FAIL CLOSED. A denied read under RLS returns zero
 * rows rather than an error, which is exactly why this is easy to get wrong and easy to not
 * notice — a bug looks like an empty list, not like a crash.
 *
 * How the roles are simulated: Supabase's policies read `auth.uid()`, which reads the
 * `request.jwt.claims` GUC. Setting that GUC and `SET LOCAL ROLE authenticated` inside a
 * transaction reproduces exactly what PostgREST does per request.
 *
 * Skipped automatically when no database is reachable, so `npm test` still works on a clean
 * clone — but the suite is NOT optional for the Phase 1 exit criterion.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';

const DB_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

let sql: postgres.Sql;
let reachable = false;

/** Two unrelated tenants, plus a third party who should see nothing private at all. */
const ALICE = '11111111-1111-1111-1111-111111111111'; // talent
const BOB = '22222222-2222-2222-2222-222222222222'; // client
const MALLORY = '33333333-3333-3333-3333-333333333333'; // unrelated third party

const ids = {
  aliceTalent: '' as string,
  bobClient: '' as string,
  job: '' as string,
  application: '' as string,
  conversation: '' as string,
  message: '' as string,
};

/** Run a query as a signed-in user, exactly as PostgREST would. */
async function asUser<T>(userId: string, fn: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  return sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL ROLE authenticated`);
    await tx.unsafe(
      `SELECT set_config('request.jwt.claims', '${JSON.stringify({ sub: userId, role: 'authenticated' })}', true)`,
    );
    return fn(tx);
  }) as Promise<T>;
}

/** Run a query as an anonymous visitor. */
async function asAnon<T>(fn: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  return sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL ROLE anon`);
    await tx.unsafe(`SELECT set_config('request.jwt.claims', '{"role":"anon"}', true)`);
    return fn(tx);
  }) as Promise<T>;
}

beforeAll(async () => {
  try {
    sql = postgres(DB_URL, { max: 2, idle_timeout: 5, connect_timeout: 5, onnotice: () => {} });
    await sql`select 1`;
    reachable = true;
  } catch {
    reachable = false;
    return;
  }

  // Seed as the owner role, which bypasses RLS — this is fixture setup, not the thing
  // under test.
  await sql`delete from auth.users where id in (${ALICE}, ${BOB}, ${MALLORY})`;
  for (const [id, email] of [
    [ALICE, 'alice@example.test'],
    [BOB, 'bob@example.test'],
    [MALLORY, 'mallory@example.test'],
  ] as const) {
    await sql`
      insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                              email_confirmed_at, created_at, updated_at)
      values (${id}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
              ${email}, 'x', now(), now(), now())`;
    await sql`insert into user_profiles (user_id, display_name) values (${id}, ${email})`;
  }

  const [talent] = await sql`
    insert into talent_profiles (user_id, slug, headline, bio, website_url, is_published)
    values (${ALICE}, 'alice', 'Automation dev', 'I build integrations.',
            'https://example.com/alice', true)
    returning id`;
  ids.aliceTalent = talent!.id;

  const [client] = await sql`
    insert into client_profiles (user_id, company_name) values (${BOB}, 'Bob Ltd') returning id`;
  ids.bobClient = client!.id;

  const [job] = await sql`
    insert into jobs (client_id, title, slug, description, engagement_type, status, published_at)
    values (${ids.bobClient}, 'Sync HubSpot and Stripe', 'sync-hubspot-stripe',
            'Two-way sync.', 'fixed', 'open', now())
    returning id`;
  ids.job = job!.id;

  const [app] = await sql`
    insert into applications (job_id, talent_id, cover_note, match_score, match_reason)
    values (${ids.job}, ${ids.aliceTalent}, 'I have shipped this twice.', 87, 'Shipped 2x')
    returning id`;
  ids.application = app!.id;

  const [conv] = await sql`
    insert into conversations (client_id, talent_id) values (${ids.bobClient}, ${ids.aliceTalent})
    returning id`;
  ids.conversation = conv!.id;

  const [msg] = await sql`
    insert into messages (conversation_id, sender_id, body)
    values (${ids.conversation}, ${BOB}, 'Are you available next month?')
    returning id`;
  ids.message = msg!.id;
}, 60_000);

afterAll(async () => {
  if (!reachable) return;
  await sql`delete from auth.users where id in (${ALICE}, ${BOB}, ${MALLORY})`;
  await sql.end();
});

const maybe = () => (reachable ? describe : describe.skip);

maybe()('RLS: messaging is participant-only', () => {
  // ADR-007 D1 made this the highest-consequence surface in the product: a leak here exposes
  // private correspondence, not a draft job post.

  it('lets both participants read the conversation', async () => {
    for (const who of [ALICE, BOB]) {
      const rows = await asUser(who, (tx) => tx`select id from conversations`);
      expect(rows.map((r) => r.id)).toContain(ids.conversation);
    }
  });

  it('hides the conversation from an unrelated third party', async () => {
    const rows = await asUser(MALLORY, (tx) => tx`select id from conversations`);
    expect(rows).toHaveLength(0);
  });

  it('hides messages from an unrelated third party', async () => {
    const rows = await asUser(MALLORY, (tx) => tx`select id, body from messages`);
    expect(rows).toHaveLength(0);
  });

  it('hides messages from anonymous visitors', async () => {
    const rows = await asAnon((tx) => tx`select id from messages`);
    expect(rows).toHaveLength(0);
  });

  it('refuses a message sent as someone else', async () => {
    await expect(
      asUser(MALLORY, (tx) =>
        tx`insert into messages (conversation_id, sender_id, body)
           values (${ids.conversation}, ${BOB}, 'spoofed')`),
    ).rejects.toThrow(/row-level security/i);
  });

  it('refuses a third party injecting into someone else’s thread', async () => {
    await expect(
      asUser(MALLORY, (tx) =>
        tx`insert into messages (conversation_id, sender_id, body)
           values (${ids.conversation}, ${MALLORY}, 'hello')`),
    ).rejects.toThrow(/row-level security/i);
  });
});

maybe()('RLS: blocks', () => {
  it('stops a blocked sender from messaging, and stays silent about it', async () => {
    await sql`insert into blocks (blocker_id, blocked_id) values (${ALICE}, ${BOB})
              on conflict do nothing`;
    try {
      // The block is re-evaluated per message, not only at thread creation.
      await expect(
        asUser(BOB, (tx) =>
          tx`insert into messages (conversation_id, sender_id, body)
             values (${ids.conversation}, ${BOB}, 'still here')`),
      ).rejects.toThrow(/row-level security/i);

      // Bob must not be able to discover that he was blocked by reading the table.
      const seen = await asUser(BOB, (tx) => tx`select * from blocks`);
      expect(seen).toHaveLength(0);
    } finally {
      await sql`delete from blocks where blocker_id = ${ALICE} and blocked_id = ${BOB}`;
    }
  });

  it('refuses a block created on someone else’s behalf', async () => {
    await expect(
      asUser(MALLORY, (tx) =>
        tx`insert into blocks (blocker_id, blocked_id) values (${ALICE}, ${BOB})`),
    ).rejects.toThrow(/row-level security/i);
  });
});

maybe()('RLS: applications are visible only to the two parties', () => {
  it('shows the application to the applying talent and to the job owner', async () => {
    for (const who of [ALICE, BOB]) {
      const rows = await asUser(who, (tx) => tx`select id from applications`);
      expect(rows.map((r) => r.id)).toContain(ids.application);
    }
  });

  it('hides it from an unrelated third party', async () => {
    const rows = await asUser(MALLORY, (tx) => tx`select id from applications`);
    expect(rows).toHaveLength(0);
  });

  it('hides it from anonymous visitors', async () => {
    const rows = await asAnon((tx) => tx`select id from applications`);
    expect(rows).toHaveLength(0);
  });

  it('refuses an application filed on another talent’s behalf', async () => {
    await expect(
      asUser(MALLORY, (tx) =>
        tx`insert into applications (job_id, talent_id, cover_note)
           values (${ids.job}, ${ids.aliceTalent}, 'not mine to send')`),
    ).rejects.toThrow(/row-level security/i);
  });
});

maybe()('RLS: drafts stay owner-only, published content is public', () => {
  it('hides an unpublished talent profile from everyone but its owner', async () => {
    const [draft] = await sql`
      insert into talent_profiles (user_id, slug, headline, bio, is_published)
      values (${MALLORY}, 'mallory-draft', 'Draft', 'wip', false) returning id`;
    try {
      const own = await asUser(MALLORY, (tx) => tx`select id from talent_profiles`);
      expect(own.map((r) => r.id)).toContain(draft!.id);

      const other = await asUser(ALICE, (tx) => tx`select id from talent_profiles`);
      expect(other.map((r) => r.id)).not.toContain(draft!.id);

      const anon = await asAnon((tx) => tx`select id from talent_profiles`);
      expect(anon.map((r) => r.id)).not.toContain(draft!.id);
    } finally {
      await sql`delete from talent_profiles where id = ${draft!.id}`;
    }
  });

  it('shows a published profile to anonymous visitors', async () => {
    const rows = await asAnon((tx) => tx`select id from talent_profiles`);
    expect(rows.map((r) => r.id)).toContain(ids.aliceTalent);
  });

  it('hides draft jobs from everyone but the owning client', async () => {
    const [draft] = await sql`
      insert into jobs (client_id, title, slug, description, engagement_type, status)
      values (${ids.bobClient}, 'Secret role', 'secret-role', 'hush', 'fixed', 'draft')
      returning id`;
    try {
      const anon = await asAnon((tx) => tx`select id from jobs`);
      expect(anon.map((r) => r.id)).not.toContain(draft!.id);

      const owner = await asUser(BOB, (tx) => tx`select id from jobs`);
      expect(owner.map((r) => r.id)).toContain(draft!.id);
    } finally {
      await sql`delete from jobs where id = ${draft!.id}`;
    }
  });

  it('refuses an edit to another user’s profile', async () => {
    await asUser(MALLORY, async (tx) => {
      const res = await tx`update talent_profiles set headline = 'hacked'
                           where id = ${ids.aliceTalent} returning id`;
      expect(res).toHaveLength(0); // fails closed: zero rows, not an error
    });
    const [after] = await sql`select headline from talent_profiles where id = ${ids.aliceTalent}`;
    expect(after!.headline).toBe('Automation dev');
  });
});

maybe()('RLS: the match score is not readable straight off the table', () => {
  // ADR-007 D2: clients get ordering + reason, never the number. match_cache is served
  // through the service role, so `authenticated` must have no way in at all.
  it('denies authenticated users any read of match_cache', async () => {
    const rows = await asUser(BOB, (tx) => tx`select * from match_cache`);
    expect(rows).toHaveLength(0);
  });

  it('denies anonymous users any read of match_cache', async () => {
    const rows = await asAnon((tx) => tx`select * from match_cache`);
    expect(rows).toHaveLength(0);
  });
});

maybe()('RLS: saved lists and notifications are owner-only', () => {
  it('keeps a client’s saved-talent list private from the talent', async () => {
    await sql`insert into saved_talent (client_id, talent_id)
              values (${ids.bobClient}, ${ids.aliceTalent}) on conflict do nothing`;
    try {
      const seen = await asUser(ALICE, (tx) => tx`select * from saved_talent`);
      expect(seen).toHaveLength(0);
    } finally {
      await sql`delete from saved_talent where client_id = ${ids.bobClient}`;
    }
  });

  it('keeps notifications to their recipient', async () => {
    await sql`insert into notifications (user_id, type, dedupe_key)
              values (${ALICE}, 'application_received', 'test-key') on conflict do nothing`;
    try {
      const mine = await asUser(ALICE, (tx) => tx`select id from notifications`);
      expect(mine.length).toBeGreaterThan(0);
      const theirs = await asUser(MALLORY, (tx) => tx`select id from notifications`);
      expect(theirs).toHaveLength(0);
    } finally {
      await sql`delete from notifications where dedupe_key = 'test-key'`;
    }
  });
});

maybe()('database-enforced business rules', () => {
  it('blocks publishing a profile with no evidence and no bio', async () => {
    await expect(
      sql`insert into talent_profiles (user_id, slug, headline, bio, is_published)
          values (${MALLORY}, 'no-evidence', 'Dev', '', true)`,
    ).rejects.toThrow(/talent_publish_gate/);
  });

  it('blocks a second application from the same talent to the same job', async () => {
    await expect(
      sql`insert into applications (job_id, talent_id, cover_note)
          values (${ids.job}, ${ids.aliceTalent}, 'again')`,
    ).rejects.toThrow(/applications_job_talent_unique/);
  });

  it('blocks an inverted budget range', async () => {
    await expect(
      sql`insert into jobs (client_id, title, slug, description, engagement_type,
                            budget_min, budget_max)
          values (${ids.bobClient}, 'Bad budget', 'bad-budget', 'x', 'fixed', 900, 100)`,
    ).rejects.toThrow(/job_budget_order/);
  });

  it('blocks a non-https portfolio URL', async () => {
    await expect(
      sql`update talent_profiles set website_url = 'javascript:alert(1)'
          where id = ${ids.aliceTalent}`,
    ).rejects.toThrow(/talent_urls_https/);
  });

  it('writes an audit row for every application status change', async () => {
    await sql`update applications set status = 'shortlisted' where id = ${ids.application}`;
    const events = await sql`
      select from_status, to_status from application_events
      where application_id = ${ids.application} order by at`;
    expect(events.length).toBeGreaterThanOrEqual(2); // the insert, then the change
    expect(events.at(-1)!.to_status).toBe('shortlisted');
    await sql`update applications set status = 'applied' where id = ${ids.application}`;
  });

  it('keeps portfolio_item_count true to the rows, so the publish gate is not decorative', async () => {
    const [item] = await sql`
      insert into portfolio_items (talent_id, title) values (${ids.aliceTalent}, 'Thing')
      returning id`;
    try {
      const [afterInsert] = await sql`
        select portfolio_item_count from talent_profiles where id = ${ids.aliceTalent}`;
      expect(afterInsert!.portfolio_item_count).toBe(1);
    } finally {
      await sql`delete from portfolio_items where id = ${item!.id}`;
    }
    const [afterDelete] = await sql`
      select portfolio_item_count from talent_profiles where id = ${ids.aliceTalent}`;
    expect(afterDelete!.portfolio_item_count).toBe(0);
  });
});
