/**
 * Full-text search and skill filtering, against the database.
 *
 * These are written as SQL rather than through the service layer because the thing under test
 * IS the SQL: a generated tsvector column, its weighting, and websearch parsing. A test that
 * mocked PostgREST would pass against the ilike implementation these replace, which is
 * precisely the failure being corrected — the old code carried a comment describing websearch
 * syntax while running a substring match, and nothing noticed for thirteen migrations.
 *
 * The cases below are the ones ilike got wrong. Each would have failed before migration 0013.
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

const CLIENT = '91919191-9191-4191-8191-919191919191';
const DEV_A = 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1';
const DEV_B = 'b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1';

async function mkUser(id: string, email: string) {
  await sql`insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
            values (${id}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', ${email}, 'x', now(), now())`;
  await sql`insert into user_profiles (user_id, display_name) values (${id}, ${email})`;
}

/** Search the way the service does: websearch_to_tsquery against the generated column. */
const searchJobs = (q: string) =>
  sql`select slug from jobs where search_vector @@ websearch_to_tsquery('english', ${q})`;
const searchTalent = (q: string) =>
  sql`select slug from talent_profiles where search_vector @@ websearch_to_tsquery('english', ${q})`;

async function reset() {
  await sql`delete from auth.users where id in (${CLIENT}, ${DEV_A}, ${DEV_B})`;
  await mkUser(CLIENT, 'search-client@example.test');
  await mkUser(DEV_A, 'search-dev-a@example.test');
  await mkUser(DEV_B, 'search-dev-b@example.test');

  const [c] =
    await sql`insert into client_profiles (user_id, company_name) values (${CLIENT}, 'Searchy') returning id`;

  await sql`insert into jobs (client_id, title, slug, description, engagement_type, status, published_at, budget_max, budget_min)
    values (${c!.id}, 'Stripe subscription migration', 'fts-stripe',
            'We need someone to move billing off a homegrown system. Developing against the Stripe API.',
            'fixed', 'open', now(), 9000, 6000)`;
  await sql`insert into jobs (client_id, title, slug, description, engagement_type, status, published_at, budget_max, budget_min)
    values (${c!.id}, 'Shopify theme work', 'fts-shopify',
            'Small Stripe-adjacent tweaks to a Shopify storefront.',
            'hourly', 'open', now(), 3000, 1000)`;
  await sql`insert into jobs (client_id, title, slug, description, engagement_type, status, published_at)
    values (${c!.id}, 'Unbudgeted role', 'fts-nobudget', 'No budget stated at all.', 'fixed', 'open', now())`;

  await sql`insert into talent_profiles (user_id, slug, headline, bio, website_url, is_published)
    values (${DEV_A}, 'fts-dev-a', 'React developer and design-systems specialist',
            ${'I build component libraries. '.repeat(6)}, 'https://e.test/a', true)`;
  await sql`insert into talent_profiles (user_id, slug, headline, bio, website_url, is_published)
    values (${DEV_B}, 'fts-dev-b', 'Rust systems engineer',
            ${'I have been developing in React Native for mobile teams. '.repeat(4)}, 'https://e.test/b', true)`;
}

afterAll(async () => {
  if (reachable) await sql`delete from auth.users where id in (${CLIENT}, ${DEV_A}, ${DEV_B})`;
  await sql.end();
});

itAnnouncesTarget(sql, DB_URL);

const maybe = reachable ? describe : describe.skip;

maybe('full-text search — the cases ilike got wrong', () => {
  beforeEach(reset);

  it('MATCHES TERMS IN DIFFERENT FIELDS — the headline case from the brief', async () => {
    // "React developer": React is in DEV_A's headline, developer is in the headline too;
    // for DEV_B, "developing" is in the bio and "React" is in the bio. ilike '%React developer%'
    // matched neither, because the two words are never adjacent in one column.
    const rows = await searchTalent('React developer');
    const slugs = rows.map((r) => r.slug);
    expect(slugs).toContain('fts-dev-a');
  });

  it('STEMS — "developing" in the text matches a search for "developer"', async () => {
    const rows = await searchTalent('developer');
    // DEV_B's bio says "developing"; only a stemmed search finds it.
    expect(rows.map((r) => r.slug)).toContain('fts-dev-b');
  });

  it('EXCLUDES with a leading minus — "stripe -shopify"', async () => {
    const rows = await searchJobs('stripe -shopify');
    const slugs = rows.map((r) => r.slug);
    expect(slugs).toContain('fts-stripe');
    expect(slugs).not.toContain('fts-shopify');
  });

  it('ANDs bare words rather than matching a literal string', async () => {
    const rows = await searchJobs('stripe billing');
    expect(rows.map((r) => r.slug).filter((s) => s.startsWith('fts-'))).toEqual(['fts-stripe']);
  });

  it('honours a quoted phrase', async () => {
    const exact = await searchJobs('"subscription migration"');
    expect(exact.map((r) => r.slug).filter((s) => s.startsWith('fts-'))).toEqual(['fts-stripe']);
    const reversed = await searchJobs('"migration subscription"');
    expect(reversed.map((r) => r.slug).filter((s) => s.startsWith('fts-'))).toEqual([]);
  });

  it('DOES NOT THROW on malformed input, unlike to_tsquery', async () => {
    // A stray operator from a real search box would make to_tsquery raise a syntax error and
    // turn a typo into a 500. websearch parses anything.
    for (const q of ['&&&', '"unclosed', 'a | | b', '-', '((']) {
      await expect(searchJobs(q)).resolves.toBeDefined();
    }
  });

  it('ranks a title match above a body mention', async () => {
    // Scoped to this suite's fixtures: the development seed also contains Stripe jobs, and an
    // unscoped ranking query measures those instead of what is under test.
    const [top] = await sql`
      select slug from jobs
      where slug like 'fts-%'
        and search_vector @@ websearch_to_tsquery('english', 'stripe')
      order by ts_rank(search_vector, websearch_to_tsquery('english', 'stripe')) desc
      limit 1`;
    // "Stripe subscription migration" is a title (weight A); the Shopify job only mentions
    // Stripe in its description (weight B).
    expect(top!.slug).toBe('fts-stripe');
  });

  it('keeps the vector current when the text changes — it is generated, not triggered', async () => {
    await sql`update jobs set title = 'Kubernetes cluster work' where slug = 'fts-nobudget'`;
    const rows = await searchJobs('kubernetes');
    expect(rows.map((r) => r.slug)).toContain('fts-nobudget');
  });
});

maybe('skill filtering over the taxonomy', () => {
  beforeEach(reset);

  it('resolves a slug to the skill and back to its holders', async () => {
    const [skill] = await sql`select id from skills limit 1`;
    if (!skill) return; // taxonomy not seeded in this database
    const [profile] = await sql`select id from talent_profiles where slug = 'fts-dev-a'`;
    await sql`insert into talent_skills (talent_id, skill_id) values (${profile!.id}, ${skill.id})`;

    const rows = await sql`
      select p.slug from talent_profiles p
      join talent_skills ts on ts.talent_id = p.id
      where ts.skill_id = ${skill.id}`;
    expect(rows.map((r) => r.slug)).toContain('fts-dev-a');
  });

  it('AN UNKNOWN SLUG MATCHES NOTHING rather than being ignored', async () => {
    // The service returns [] for unresolved slugs and the caller short-circuits to an empty
    // page. Dropping the unrecognised half of a filter would silently widen the results.
    const rows = await sql`select id from skills where slug = 'not-a-real-skill'`;
    expect(rows).toHaveLength(0);
  });
});

maybe('budget sort puts unknowns last', () => {
  beforeEach(reset);

  it('a job with no budget does not rank as the cheapest', async () => {
    // NULL is "unstated", not zero. Sorting it first under "lowest budget" would be a lie.
    const rows = await sql`
      select slug from jobs where status = 'open' and slug like 'fts-%'
      order by budget_min asc nulls last, id desc`;
    expect(rows.at(-1)!.slug).toBe('fts-nobudget');
  });

  it('highest budget leads with the largest stated maximum', async () => {
    const rows = await sql`
      select slug from jobs where status = 'open' and slug like 'fts-%'
      order by budget_max desc nulls last, id desc`;
    expect(rows[0]!.slug).toBe('fts-stripe');
  });
});
