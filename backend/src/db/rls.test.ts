/**
 * RLS cross-tenant tests — Phase 1 exit criterion.
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

import { itAnnouncesTarget } from './test-target';

const DB_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

/**
 * The reachability probe runs at MODULE SCOPE, not in `beforeAll`.
 *
 * Vitest decides `describe` vs `describe.skip` while COLLECTING the file, which happens
 * before any hook runs. Setting a `reachable` flag inside `beforeAll` is therefore always too
 * late — every suite silently skipped even with the database up. Top-level await is the fix.
 */
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
    console.info(`[rls.test] connected to ${DB_URL.replace(/:[^:@]+@/, ':****@')}`);
    return true;
  },
  (e: Error) => {
    // Never swallow the reason: a silent skip hides a broken database as effectively as a
    // broken test, and this suite is a Phase 1 exit criterion.
    console.warn(`[rls.test] skipping — cannot reach ${DB_URL}: ${e.message}`);
    return false;
  },
);

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

/**
 * Run a query as a signed-in user, exactly as PostgREST would.
 *
 * BOTH claim GUCs are set on purpose. There are two generations of `auth.uid()` in the wild:
 *
 *   old:  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
 *   new:  coalesce(request.jwt.claim.sub, request.jwt.claims::jsonb ->> 'sub')
 *
 * The base `supabase/postgres` image ships the OLD one, which reads the dotted
 * `request.jwt.claim.sub`; hosted Supabase ships the new one, which also reads the
 * `request.jwt.claims` JSON blob. Setting only `claims` made `auth.uid()` return NULL
 * locally, so every policy denied everything and the negative assertions passed for entirely
 * the wrong reason — the most dangerous shape a security test can take.
 *
 * Setting both makes this suite correct against either generation.
 */
async function asUser<T>(
  userId: string,
  fn: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  return sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL ROLE authenticated`);
    await tx`select set_config('request.jwt.claim.sub', ${userId}, true)`;
    await tx`select set_config('request.jwt.claims',
                               ${JSON.stringify({ sub: userId, role: 'authenticated' })}, true)`;
    return fn(tx);
  }) as Promise<T>;
}

/** Run a query as an anonymous visitor. */
async function asAnon<T>(fn: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  return sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL ROLE anon`);
    await tx`select set_config('request.jwt.claim.sub', '', true)`;
    await tx`select set_config('request.jwt.claims', '{"role":"anon"}', true)`;
    return fn(tx);
  }) as Promise<T>;
}

beforeAll(async () => {
  if (!reachable) return;

  // Seed as the owner role, which bypasses RLS — this is fixture setup, not the thing
  // under test.
  await sql`delete from auth.users where id in (${ALICE}, ${BOB}, ${MALLORY})`;
  for (const [id, email] of [
    [ALICE, 'alice@example.test'],
    [BOB, 'bob@example.test'],
    [MALLORY, 'mallory@example.test'],
  ] as const) {
    // Base-schema columns only — see backend/src/db/seed.ts. These fixtures never sign in; the tests
    // set request.jwt.claims directly, which is what auth.uid() actually reads.
    await sql`
      insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                              created_at, updated_at)
      values (${id}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
              ${email}, 'x', now(), now())`;
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

itAnnouncesTarget(sql, DB_URL);

const maybe = () => (reachable ? describe : describe.skip);

maybe()('RLS: messaging is participant-only', () => {
  // the direct-messaging decision made this the highest-consequence surface in the product: a leak here exposes
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
      asUser(
        MALLORY,
        (tx) =>
          tx`insert into messages (conversation_id, sender_id, body)
           values (${ids.conversation}, ${BOB}, 'spoofed')`,
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('refuses a third party injecting into someone else’s thread', async () => {
    await expect(
      asUser(
        MALLORY,
        (tx) =>
          tx`insert into messages (conversation_id, sender_id, body)
           values (${ids.conversation}, ${MALLORY}, 'hello')`,
      ),
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
        asUser(
          BOB,
          (tx) =>
            tx`insert into messages (conversation_id, sender_id, body)
             values (${ids.conversation}, ${BOB}, 'still here')`,
        ),
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
      asUser(
        MALLORY,
        (tx) => tx`insert into blocks (blocker_id, blocked_id) values (${ALICE}, ${BOB})`,
      ),
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
      asUser(
        MALLORY,
        (tx) =>
          tx`insert into applications (job_id, talent_id, cover_note)
           values (${ids.job}, ${ids.aliceTalent}, 'not mine to send')`,
      ),
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
  // the score-asymmetry rule: clients get ordering + reason, never the number. match_cache is served
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
  it('ALLOWS publishing a profile with no evidence and no bio', async () => {
    // This asserted the opposite until 2026-09-23, when talent_publish_gate was dropped.
    // Inverted rather than deleted: the database is where the old gate lived, so this is
    // where its return would first show up.
    const rows = await sql`insert into talent_profiles (user_id, slug, headline, bio, is_published)
          values (${MALLORY}, 'no-evidence', 'Dev', '', true) returning is_published`;
    expect(rows[0]!.is_published).toBe(true);
  });

  it('AN OPEN JOB IS READABLE BY ANYONE — which is why pages must check ownership', async () => {
    /**
     * This is correct behaviour for a public job board, and it is also a trap.
     *
     * `jobs_select_open_or_own` is `status <> 'draft' OR owner`, so any authenticated user can
     * select any open job by id. Two dashboard pages relied on a comment claiming RLS scoped
     * jobs to their owner and guarded with `if (!job) notFound()` — which never fired. A
     * developer who had applied could open the client-side management page for that job.
     *
     * Pinned here so the policy's real shape is written down where the next person looks.
     */
    const rows = await asUser(MALLORY, (tx) => tx`select id from jobs where id = ${ids.job}`);
    expect(rows).toHaveLength(1);
  });

  it('a DRAFT job is not readable by a stranger', async () => {
    await sql`update jobs set status = 'draft' where id = ${ids.job}`;
    const rows = await asUser(MALLORY, (tx) => tx`select id from jobs where id = ${ids.job}`);
    expect(rows).toHaveLength(0);
    await sql`update jobs set status = 'open' where id = ${ids.job}`;
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

/**
 * Write guards (migration 0026). Every case here was reachable before it: RLS decides which
 * ROWS a user may write, not which COLUMNS, and anyone can call the API directly with their own
 * session token, so these run the exact statement a hand-made request would.
 */
maybe()('write guards: a participant cannot rewrite what is not theirs', () => {
  it('REFUSES a recipient rewriting the sender’s message', async () => {
    await expect(
      asUser(
        ALICE,
        (tx) => tx`update messages set body = 'pay me off-platform' where id = ${ids.message}`,
      ),
    ).rejects.toThrow(/cannot be edited/);
    const [msg] = await sql`select body from messages where id = ${ids.message}`;
    expect(msg!.body).toBe('Are you available next month?');
  });

  it('REFUSES a recipient reassigning the message to another sender', async () => {
    await expect(
      asUser(
        ALICE,
        (tx) => tx`update messages set sender_id = ${MALLORY} where id = ${ids.message}`,
      ),
    ).rejects.toThrow(/cannot be edited/);
  });

  it('still lets the recipient mark it read', async () => {
    const rows = await asUser(
      ALICE,
      (tx) => tx`update messages set read_at = now() where id = ${ids.message} returning id`,
    );
    expect(rows).toHaveLength(1);
    await sql`update messages set read_at = null where id = ${ids.message}`;
  });

  it('REFUSES a participant swapping the other side of a conversation', async () => {
    const [other] = await sql`
      insert into client_profiles (user_id, company_name) values (${MALLORY}, 'Mallory Co')
      returning id`;
    try {
      await expect(
        asUser(
          ALICE,
          (tx) =>
            tx`update conversations set client_id = ${other!.id} where id = ${ids.conversation}`,
        ),
      ).rejects.toThrow(/participants cannot be changed/);
    } finally {
      await sql`delete from client_profiles where id = ${other!.id}`;
    }
  });

  it('REFUSES a company marking itself verified', async () => {
    await expect(
      asUser(
        BOB,
        (tx) => tx`update client_profiles set is_verified = true where id = ${ids.bobClient}`,
      ),
    ).rejects.toThrow(/Verification is set by TechSelect/);
  });

  it('starts a company unverified whatever the insert says', async () => {
    const [row] = await asUser(
      MALLORY,
      (tx) => tx`insert into client_profiles (user_id, company_name, is_verified)
                 values (${MALLORY}, 'Self-verified Ltd', true) returning id, is_verified`,
    );
    try {
      expect(row!.is_verified).toBe(false);
    } finally {
      await sql`delete from client_profiles where id = ${row!.id}`;
    }
  });
});

maybe()('write guards: applications move only along the transition table', () => {
  it('REFUSES an applicant promoting their own application', async () => {
    await expect(
      asUser(
        ALICE,
        (tx) => tx`update applications set status = 'shortlisted' where id = ${ids.application}`,
      ),
    ).rejects.toThrow(/not allowed from here/);
  });

  it('REFUSES the client jumping from applied straight to hired', async () => {
    await expect(
      asUser(
        BOB,
        (tx) => tx`update applications set status = 'hired' where id = ${ids.application}`,
      ),
    ).rejects.toThrow(/not allowed from here/);
  });

  it('REFUSES the client editing the cover note', async () => {
    await expect(
      asUser(
        BOB,
        (tx) => tx`update applications set cover_note = 'edited' where id = ${ids.application}`,
      ),
    ).rejects.toThrow(/Only an application/);
  });

  it('lets the client shortlist, and the applicant withdraw', async () => {
    try {
      const shortlisted = await asUser(
        BOB,
        (tx) => tx`update applications set status = 'shortlisted'
                   where id = ${ids.application} returning status`,
      );
      expect(shortlisted[0]!.status).toBe('shortlisted');

      const withdrawn = await asUser(
        ALICE,
        (tx) => tx`update applications set status = 'withdrawn'
                   where id = ${ids.application} returning status`,
      );
      expect(withdrawn[0]!.status).toBe('withdrawn');
    } finally {
      await sql`update applications set status = 'applied' where id = ${ids.application}`;
    }
  });

  it('files a new application as applied and unscored, dated now', async () => {
    const [job] = await sql`
      insert into jobs (client_id, title, slug, description, engagement_type, status, published_at)
      values (${ids.bobClient}, 'Guard test', 'guard-test', 'x', 'fixed', 'open', now())
      returning id`;
    try {
      const [row] = await asUser(
        ALICE,
        (tx) => tx`insert into applications (job_id, talent_id, cover_note, status, match_score,
                                             created_at)
                   values (${job!.id}, ${ids.aliceTalent}, 'forged', 'hired', 100, '2000-01-01')
                   returning status, match_score, created_at`,
      );
      expect(row!.status).toBe('applied');
      expect(row!.match_score).toBeNull();
      expect(new Date(row!.created_at).getFullYear()).toBeGreaterThan(2000);
    } finally {
      await sql`delete from jobs where id = ${job!.id}`;
    }
  });
});

maybe()('write guards: derived columns and private rows', () => {
  it('ignores a developer writing their own embedding or portfolio count', async () => {
    await asUser(
      ALICE,
      (tx) => tx`update talent_profiles
                 set embedding = array_fill(0.1, array[1536])::vector, portfolio_item_count = 99
                 where id = ${ids.aliceTalent}`,
    );
    const [after] = await sql`
      select embedding is null as no_embedding, portfolio_item_count
      from talent_profiles where id = ${ids.aliceTalent}`;
    expect(after!.no_embedding).toBe(true);
    expect(after!.portfolio_item_count).toBe(0);
  });

  it('ignores a user setting their own role flags', async () => {
    await asUser(
      ALICE,
      (tx) => tx`update user_profiles set has_client = true where user_id = ${ALICE}`,
    );
    const [after] = await sql`select has_client from user_profiles where user_id = ${ALICE}`;
    expect(after!.has_client).toBe(false);
  });

  it('keeps an account row to its owner', async () => {
    const own = await asUser(ALICE, (tx) => tx`select user_id from user_profiles`);
    expect(own.map((r) => r.user_id)).toEqual([ALICE]);

    const anon = await asAnon((tx) => tx`select user_id from user_profiles`);
    expect(anon).toHaveLength(0);
  });

  it('dates a report and a publish now, so backdating cannot dodge the rate limits', async () => {
    const [report] = await asUser(
      MALLORY,
      (tx) => tx`insert into reports (reporter_id, subject_type, subject_id, reason, created_at)
                 values (${MALLORY}, 'job', ${ids.job}, 'test', '2000-01-01')
                 returning id, created_at`,
    );
    try {
      expect(new Date(report!.created_at).getFullYear()).toBeGreaterThan(2000);
    } finally {
      await sql`delete from reports where id = ${report!.id}`;
    }

    await asUser(
      BOB,
      (tx) => tx`update jobs set published_at = '2000-01-01' where id = ${ids.job}`,
    );
    const [job] = await sql`select published_at from jobs where id = ${ids.job}`;
    expect(new Date(job!.published_at).getFullYear()).toBeGreaterThan(2000);
  });

  it('does not offer is_blocked over the API, so nobody can ask who blocked them', async () => {
    // The policies call private.is_blocked; `private` is not a schema PostgREST exposes.
    await expect(
      asUser(BOB, (tx) => tx`select public.is_blocked(${ALICE}, ${BOB})`),
    ).rejects.toThrow(/does not exist/);
  });
});

/** Sign-in, sign-up and reset attempt limits (migration 0027, backend/src/security/auth-limit.ts). */
maybe()('auth attempt limits', () => {
  const KEY = 'rls-test:ip:203.0.113.7';

  it('allows attempts up to the limit, then refuses until the window passes', async () => {
    try {
      const results: boolean[] = [];
      for (let i = 0; i < 4; i++) {
        const [row] = await sql`select public.reserve_auth_attempt(${KEY}, 3, 60) as ok`;
        results.push(row!.ok);
      }
      expect(results).toEqual([true, true, true, false]);

      // Attempts older than the window no longer count.
      await sql`update auth_attempts set at = now() - interval '2 minutes' where key = ${KEY}`;
      const [after] = await sql`select public.reserve_auth_attempt(${KEY}, 3, 60) as ok`;
      expect(after!.ok).toBe(true);
    } finally {
      await sql`delete from auth_attempts where key = ${KEY}`;
    }
  });

  it('is out of reach of signed-in users and visitors, table and function alike', async () => {
    await expect(
      asUser(MALLORY, (tx) => tx`select public.reserve_auth_attempt(${KEY}, 100, 60)`),
    ).rejects.toThrow(/permission denied/);
    await expect(asAnon((tx) => tx`select * from auth_attempts`)).rejects.toThrow(
      /permission denied/,
    );
  });
});
