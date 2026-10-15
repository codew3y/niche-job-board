/**
 * Certifications (migration 0022), against the database: who can read and write them.
 *
 * Same rules as talent_experience. Readable by anyone while the profile is published and always
 * by its owner; writable only by the owner; https-only verification links; removed with the
 * account (the cascade from talent_profiles).
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';

import { itAnnouncesTarget } from './test-target';

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

const OWNER = 'ce7ce7ce-0000-4000-8000-000000000001';
const OTHER = 'ce7ce7ce-0000-4000-8000-000000000002';
let talentId = '';

async function as<T>(
  role: 'authenticated' | 'anon',
  userId: string,
  fn: (tx: postgres.TransactionSql) => Promise<T>,
) {
  return sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL ROLE ${role}`);
    await tx`select set_config('request.jwt.claim.sub', ${userId}, true)`;
    // An anonymous visitor has no `sub` at all (as in rls.test.ts); an empty one is not a uuid.
    const claims = role === 'anon' ? { role } : { sub: userId, role };
    await tx`select set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`;
    return fn(tx);
  }) as Promise<T>;
}

async function mkUser(id: string, email: string) {
  await sql`insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
            values (${id}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', ${email}, 'x', now(), now())`;
  await sql`insert into user_profiles (user_id, display_name) values (${id}, ${email})`;
}

const maybe = reachable ? describe : describe.skip;
itAnnouncesTarget(sql, DB_URL);

beforeEach(async () => {
  if (!reachable) return;
  await sql`delete from auth.users where id in (${OWNER}, ${OTHER})`;
  await mkUser(OWNER, 'cert-owner@example.test');
  await mkUser(OTHER, 'cert-other@example.test');
  const [t] = await sql`insert into talent_profiles (user_id, slug, headline, bio, is_published)
                        values (${OWNER}, 'cert-owner', 'Cloud developer', '', true) returning id`;
  talentId = t!.id;
  await sql`insert into talent_certifications (talent_id, name, issuer, issued_on)
            values (${talentId}, 'AWS Certified Developer', 'Amazon Web Services', '2024-03-01')`;
});

afterAll(async () => {
  if (reachable) await sql`delete from auth.users where id in (${OWNER}, ${OTHER})`;
  await sql.end();
});

const count = (tx: postgres.TransactionSql) =>
  tx`select count(*)::int as n from talent_certifications where talent_id = ${talentId}`.then(
    (r) => r[0]!.n as number,
  );

maybe('who can read a certification', () => {
  it('anyone, while the profile is published', async () => {
    expect(await as('anon', '', count)).toBe(1);
  });

  it('only the owner, once the profile is unpublished', async () => {
    await sql`update talent_profiles set is_published = false where id = ${talentId}`;
    expect(await as('anon', '', count)).toBe(0);
    expect(await as('authenticated', OTHER, count)).toBe(0);
    expect(await as('authenticated', OWNER, count)).toBe(1);
  });
});

maybe('who can write one', () => {
  it('REFUSES another user adding a certification to the profile', async () => {
    await expect(
      as(
        'authenticated',
        OTHER,
        (tx) => tx`insert into talent_certifications (talent_id, name, issuer, issued_on)
                   values (${talentId}, 'Fake cert', 'Nobody', '2024-01-01')`,
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("silently changes nothing when another user edits or deletes the owner's certification", async () => {
    await as('authenticated', OTHER, (tx) => tx`update talent_certifications set name = 'Hacked'`);
    await as('authenticated', OTHER, (tx) => tx`delete from talent_certifications`);
    const [r] = await sql`select name from talent_certifications where talent_id = ${talentId}`;
    expect(r?.name).toBe('AWS Certified Developer');
  });

  it('lets the owner add one', async () => {
    await as(
      'authenticated',
      OWNER,
      (
        tx,
      ) => tx`insert into talent_certifications (talent_id, name, issuer, issued_on, verification_url)
                 values (${talentId}, 'CKA', 'The Linux Foundation', '2025-01-01',
                         'https://www.credly.com/badges/abc')`,
    );
    expect(await as('authenticated', OWNER, count)).toBe(2);
  });
});

maybe('constraints', () => {
  it('REFUSES a non-https verification link', async () => {
    await expect(
      sql`insert into talent_certifications (talent_id, name, issuer, issued_on, verification_url)
          values (${talentId}, 'CKA', 'The Linux Foundation', '2025-01-01', 'javascript:alert(1)')`,
    ).rejects.toThrow(/certification_url_https/);
  });

  it('REFUSES an expiry before the issue date', async () => {
    await expect(
      sql`insert into talent_certifications (talent_id, name, issuer, issued_on, expires_on)
          values (${talentId}, 'CKA', 'The Linux Foundation', '2025-01-01', '2024-01-01')`,
    ).rejects.toThrow(/certification_date_order/);
  });

  it('goes with the account', async () => {
    await sql`delete from auth.users where id = ${OWNER}`;
    const [r] =
      await sql`select count(*)::int as n from talent_certifications where talent_id = ${talentId}`;
    expect(r!.n).toBe(0);
  });
});
