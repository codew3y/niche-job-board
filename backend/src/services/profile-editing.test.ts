/**
 * Editing a profile that is ALREADY published.
 *
 * Onboarding used to build up to a publish gate, and editing could walk back through it. The
 * gate is gone; this suite now pins its absence. Originally:
 * that is where the interesting failures are: an edit that removes the last piece of
 * evidence must not leave a published profile the gate would reject.
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';

import { profileSuggestions } from '../schemas/talent';

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

maybe('there is no publish gate', () => {
  beforeEach(reset);

  /**
   * This suite used to assert the opposite of everything below: that emptying a bio or
   * dropping below two projects on a live profile was REFUSED by talent_publish_gate.
   *
   * Migration 0014 dropped that constraint. These tests are the inverse, and they exist so
   * the gate cannot return by accident — a CHECK reintroduced in a later migration would
   * fail here rather than quietly start refusing people again.
   */

  it('a published profile can be emptied to nothing and stays published', async () => {
    await sql`update talent_profiles set bio = '' where id = ${ids.profile}`;
    const [p] = await sql`select bio, is_published from talent_profiles where id = ${ids.profile}`;
    expect(p!.bio).toBe('');
    expect(p!.is_published).toBe(true);
  });

  it('EVERY PROJECT CAN BE DELETED while published', async () => {
    const items = await sql`select id from portfolio_items where talent_id = ${ids.profile}`;
    for (const item of items) {
      await sql`delete from portfolio_items where id = ${item.id}`;
    }
    const [p] =
      await sql`select portfolio_item_count, is_published from talent_profiles where id = ${ids.profile}`;
    expect(p!.portfolio_item_count).toBe(0);
    expect(p!.is_published).toBe(true);
  });

  it('a profile with no bio, no site and no projects can be published from scratch', async () => {
    await sql`update talent_profiles
              set bio = '', website_url = null, is_published = false
              where id = ${ids.profile}`;
    const items = await sql`select id from portfolio_items where talent_id = ${ids.profile}`;
    for (const item of items) await sql`delete from portfolio_items where id = ${item.id}`;

    await sql`update talent_profiles set is_published = true where id = ${ids.profile}`;
    const [p] = await sql`select is_published from talent_profiles where id = ${ids.profile}`;
    expect(p!.is_published).toBe(true);
  });

  it('THE CONSTRAINT IS ACTUALLY GONE, not merely unreached', async () => {
    const rows = await sql`select 1 from pg_constraint where conname = 'talent_publish_gate'`;
    expect(rows).toHaveLength(0);
  });

  it('the panel offers suggestions where it used to list blockers', () => {
    // Same observations, different force: these never disable the publish button.
    expect(
      profileSuggestions({ bio: BIO, websiteUrl: null, portfolioItemCount: 2, skillCount: 1 }),
    ).toEqual([]);
    expect(
      profileSuggestions({ bio: '', websiteUrl: null, portfolioItemCount: 0, skillCount: 0 }),
    ).toHaveLength(3);
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
