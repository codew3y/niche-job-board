/**
 * Editing a profile that is ALREADY published.
 *
 * Onboarding only ever builds up to the publish gate. Editing can walk back through it, and
 * that is where the interesting failures are: an edit that removes the last piece of
 * evidence must not leave a published profile the gate would reject.
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';

import { publishBlockers } from '../schemas/talent';

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

const OWNER = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const RIVAL = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
let ids = { profile: '' };
const BIO = 'x'.repeat(200);

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

/** A published profile whose ONLY evidence is two projects — the fragile case. */
async function reset() {
  await sql`delete from auth.users where id in (${OWNER}, ${RIVAL})`;
  await mkUser(OWNER, 'edit-owner@example.test');
  await mkUser(RIVAL, 'edit-rival@example.test');

  const [p] = await sql`insert into talent_profiles (user_id, slug, headline, bio, is_published)
    values (${OWNER}, 'edit-owner', 'Developer', ${BIO}, false) returning id`;
  await sql`insert into portfolio_items (talent_id, title, description)
            values (${p!.id}, 'One', ${'d'.repeat(50)}), (${p!.id}, 'Two', ${'d'.repeat(50)})`;
  await sql`update talent_profiles set is_published = true where id = ${p!.id}`;
  ids = { profile: p!.id };
}

afterAll(async () => {
  if (reachable) await sql`delete from auth.users where id in (${OWNER}, ${RIVAL})`;
  await sql.end();
});

const maybe = reachable ? describe : describe.skip;

maybe('the publish gate holds during editing', () => {
  beforeEach(reset);

  it('the fixture is genuinely published on two items alone', async () => {
    const [p] =
      await sql`select is_published, portfolio_item_count, website_url from talent_profiles where id = ${ids.profile}`;
    expect(p!.is_published).toBe(true);
    expect(p!.portfolio_item_count).toBe(2);
    expect(p!.website_url).toBeNull();
  });

  it('REFUSES to empty the bio of a published profile', async () => {
    await expect(
      sql`update talent_profiles set bio = '' where id = ${ids.profile}`,
    ).rejects.toThrow(/talent_publish_gate/);
  });

  it('REFUSES to drop below two items while published', async () => {
    // Deleting an item drops portfolio_item_count via trigger, which the CHECK then rejects.
    const [item] =
      await sql`select id from portfolio_items where talent_id = ${ids.profile} limit 1`;
    await expect(sql`delete from portfolio_items where id = ${item!.id}`).rejects.toThrow(
      /talent_publish_gate/,
    );
  });

  it('ALLOWS the same delete once unpublished — which is what the action does first', async () => {
    await sql`update talent_profiles set is_published = false where id = ${ids.profile}`;
    const [item] =
      await sql`select id from portfolio_items where talent_id = ${ids.profile} limit 1`;
    await sql`delete from portfolio_items where id = ${item!.id}`;
    const [p] =
      await sql`select portfolio_item_count from talent_profiles where id = ${ids.profile}`;
    expect(p!.portfolio_item_count).toBe(1);
  });

  it('ALLOWS dropping to one item if a site link is added first', async () => {
    // The two evidence routes are interchangeable — that is the whole of ADR-004.
    await sql`update talent_profiles set website_url = 'https://example.test/me' where id = ${ids.profile}`;
    const [item] =
      await sql`select id from portfolio_items where talent_id = ${ids.profile} limit 1`;
    await sql`delete from portfolio_items where id = ${item!.id}`;
    const [p] =
      await sql`select is_published, portfolio_item_count from talent_profiles where id = ${ids.profile}`;
    expect(p!.is_published).toBe(true);
    expect(p!.portfolio_item_count).toBe(1);
  });

  it('the UI warning fires for exactly the states the constraint rejects', () => {
    // publishBlockers is what the page renders; the CHECK is what the database enforces.
    // If these disagree the user is told to do something the system refuses.
    expect(publishBlockers({ bio: BIO, websiteUrl: null, portfolioItemCount: 2 })).toEqual([]);
    expect(publishBlockers({ bio: BIO, websiteUrl: null, portfolioItemCount: 1 })).toHaveLength(1);
    expect(publishBlockers({ bio: '', websiteUrl: null, portfolioItemCount: 2 })).toHaveLength(1);
    expect(
      publishBlockers({ bio: BIO, websiteUrl: 'https://x.test', portfolioItemCount: 0 }),
    ).toEqual([]);
  });
});

maybe('ownership of profile edits', () => {
  beforeEach(reset);

  it('lets the owner edit', async () => {
    const rows = await asUser(
      OWNER,
      (tx) =>
        tx`update talent_profiles set headline = 'Updated' where id = ${ids.profile} returning id`,
    );
    expect(rows).toHaveLength(1);
  });

  it('stops a rival editing — zero rows, and the value is untouched', async () => {
    const rows = await asUser(
      RIVAL,
      (tx) =>
        tx`update talent_profiles set headline = 'Hijacked' where id = ${ids.profile} returning id`,
    );
    expect(rows).toHaveLength(0);
    const [after] = await sql`select headline from talent_profiles where id = ${ids.profile}`;
    expect(after!.headline).toBe('Developer');
  });

  it('stops a rival adding a project to someone else’s profile', async () => {
    await expect(
      asUser(
        RIVAL,
        (tx) =>
          tx`insert into portfolio_items (talent_id, title, description)
           values (${ids.profile}, 'Not mine', ${'d'.repeat(50)})`,
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('stops a rival reordering someone else’s projects', async () => {
    const rows = await asUser(
      RIVAL,
      (tx) =>
        tx`update portfolio_items set sort_order = 99 where talent_id = ${ids.profile} returning id`,
    );
    expect(rows).toHaveLength(0);
  });
});
