/**
 * Profile photos and company logos (migration 0025): only an image in the owner's own folder of
 * the media bucket may be saved. Not someone else's upload, not an outside URL.
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

const DEV = 'bbbb0000-0000-4000-8000-0000000000d1';
const CLIENT = 'bbbb0000-0000-4000-8000-0000000000c1';
const BASE = 'https://project.supabase.co/storage/v1/object/public/media';

async function as<T>(userId: string, fn: (tx: postgres.TransactionSql) => Promise<T>) {
  return sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL ROLE authenticated`);
    await tx`select set_config('request.jwt.claim.sub', ${userId}, true)`;
    await tx`select set_config('request.jwt.claims',
                               ${JSON.stringify({ sub: userId, role: 'authenticated' })}, true)`;
    return fn(tx);
  }) as Promise<T>;
}

const maybe = reachable ? describe : describe.skip;
itAnnouncesTarget(sql, DB_URL);

beforeEach(async () => {
  if (!reachable) return;
  await sql`delete from auth.users where id in (${DEV}, ${CLIENT})`;
  for (const [id, email] of [
    [DEV, 'photo-dev@example.test'],
    [CLIENT, 'photo-client@example.test'],
  ] as const) {
    await sql`insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
              values (${id}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', ${email}, 'x', now(), now())`;
    await sql`insert into user_profiles (user_id, display_name) values (${id}, ${email})`;
  }
  await sql`insert into talent_profiles (user_id, slug, headline, bio) values (${DEV}, 'photo-dev', 'Photo developer', '')`;
  await sql`insert into client_profiles (user_id, company_name) values (${CLIENT}, 'Photo Co')`;
});

afterAll(async () => {
  if (reachable) await sql`delete from auth.users where id in (${DEV}, ${CLIENT})`;
  await sql.end();
});

maybe('where a profile photo may come from', () => {
  it('accepts an image in the owner’s own folder', async () => {
    await as(
      DEV,
      (tx) =>
        tx`update talent_profiles set avatar_url = ${`${BASE}/${DEV}/a.webp`} where user_id = ${DEV}`,
    );
  });

  it('REFUSES someone else’s upload', async () => {
    await expect(
      as(
        DEV,
        (tx) =>
          tx`update talent_profiles set avatar_url = ${`${BASE}/${CLIENT}/a.webp`} where user_id = ${DEV}`,
      ),
    ).rejects.toThrow(/talent_avatar_own_upload/);
  });

  it('REFUSES an outside or non-https image', async () => {
    for (const url of [
      'https://tracker.example/pixel.gif',
      `http://project.supabase.co/storage/v1/object/public/media/${DEV}/a.webp`,
    ]) {
      await expect(
        as(DEV, (tx) => tx`update talent_profiles set avatar_url = ${url} where user_id = ${DEV}`),
      ).rejects.toThrow(/talent_avatar_own_upload/);
    }
  });
});

maybe('where a company logo may come from', () => {
  it('accepts the owner’s own upload and refuses anything else', async () => {
    await as(
      CLIENT,
      (tx) =>
        tx`update client_profiles set logo_url = ${`${BASE}/${CLIENT}/logo.webp`} where user_id = ${CLIENT}`,
    );
    await expect(
      as(
        CLIENT,
        (tx) =>
          tx`update client_profiles set logo_url = 'https://tracker.example/logo.png' where user_id = ${CLIENT}`,
      ),
    ).rejects.toThrow(/client_logo_own_upload/);
  });
});
