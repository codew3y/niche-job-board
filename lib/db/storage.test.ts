/**
 * Storage policies.
 *
 * The `media` bucket is PUBLIC-read by design (portfolio images are rendered on public
 * profile pages), so the thing worth testing is not reading — it is that one person cannot
 * write into, overwrite, or DELETE another person's folder. Delete is the one that matters
 * most: without a scoped delete policy, any authenticated user could destroy anyone's
 * portfolio images from a browser console.
 *
 * The authorization rule is the first path segment: media/{auth.uid()}/{file}. These tests
 * exist so that rule is verified rather than assumed, because it only holds if the
 * application never builds a path from client-supplied text.
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
  () => {
    // Announce the target. Reporting green without saying WHICH database was measured is how
    // a hosted verification silently becomes a local one — the failure that made every DB
    // suite here print this line.
    console.info(`[storage.test] connected to ${DB_URL.replace(/:[^:@]+@/, ':****@')}`);
    return true;
  },
  (e: Error) => {
    // Never swallow the reason: a silent skip hides a broken database as well as a broken
    // test does.
    console.warn(`[storage.test] skipping — cannot reach ${DB_URL}: ${e.message}`);
    return false;
  },
);

const OWNER = '61616161-6161-4161-8161-616161616161';
const INTRUDER = '71717171-7171-4171-8171-717171717171';

async function mkUser(id: string, email: string) {
  await sql`insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
            values (${id}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', ${email}, 'x', now(), now())`;
  await sql`insert into user_profiles (user_id, display_name) values (${id}, ${email})`;
}

/**
 * storage.objects carries a BEFORE DELETE STATEMENT trigger (storage.protect_delete) that
 * refuses direct SQL deletes outright, so that an admin running DML by hand cannot orphan the
 * files on disk behind the rows. It is a footgun guard, not a security boundary — it fires per
 * STATEMENT, before RLS has filtered anything, and it has a documented opt-out.
 *
 * Left in place it would mask exactly what these tests check: an intruder's DELETE would raise
 * the trigger's error rather than being filtered to zero rows by policy, and the test would
 * pass while proving nothing about authorization. So the opt-out is set LOCAL to the
 * transaction, which puts RLS back in charge of the outcome.
 */
async function allowDeletes(tx: postgres.TransactionSql) {
  await tx`select set_config('storage.allow_delete_query', 'true', true)`;
}

async function asUser<T>(
  userId: string,
  fn: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  return sql.begin(async (tx) => {
    await allowDeletes(tx);
    await tx.unsafe('SET LOCAL ROLE authenticated');
    await tx`select set_config('request.jwt.claim.sub', ${userId}, true)`;
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, role: 'authenticated' })}, true)`;
    return fn(tx);
  }) as Promise<T>;
}

const OWNER_PATH = `${OWNER}/shipped-dashboard.webp`;

async function reset() {
  await sql.begin(async (tx) => {
    await allowDeletes(tx);
    await tx`delete from storage.objects where bucket_id = 'media'`;
  });
  await sql`delete from auth.users where id in (${OWNER}, ${INTRUDER})`;
  await mkUser(OWNER, 'storage-owner@example.test');
  await mkUser(INTRUDER, 'storage-intruder@example.test');
  await sql`insert into storage.objects (bucket_id, name, owner) values ('media', ${OWNER_PATH}, ${OWNER})`;
}

afterAll(async () => {
  if (reachable) {
    await sql.begin(async (tx) => {
      await allowDeletes(tx);
      await tx`delete from storage.objects where bucket_id = 'media'`;
    });
    await sql`delete from auth.users where id in (${OWNER}, ${INTRUDER})`;
  }
  await sql.end();
});

itAnnouncesTarget(sql, DB_URL);

const maybe = reachable ? describe : describe.skip;

maybe('the media bucket is configured, not assumed', () => {
  it('exists, is public, and caps at the same 5 MB the Zod schema does', async () => {
    const [bucket] = await sql`select * from storage.buckets where id = 'media'`;
    expect(bucket).toBeDefined();
    expect(bucket!.public).toBe(true);
    expect(Number(bucket!.file_size_limit)).toBe(5 * 1024 * 1024);
  });

  it('REFUSES SVG — it can carry script and would be served from our own origin', async () => {
    const [bucket] = await sql`select allowed_mime_types from storage.buckets where id = 'media'`;
    expect(bucket!.allowed_mime_types).not.toContain('image/svg+xml');
    expect(bucket!.allowed_mime_types).toEqual([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
    ]);
  });
});

maybe('media objects — the first path segment is the authorization check', () => {
  beforeEach(reset);

  it('the owner can write into their own folder', async () => {
    const rows = await asUser(
      OWNER,
      (tx) =>
        tx`insert into storage.objects (bucket_id, name, owner) values ('media', ${`${OWNER}/second.png`}, ${OWNER}) returning name`,
    );
    expect(rows).toHaveLength(1);
  });

  it('AN INTRUDER CANNOT WRITE INTO SOMEONE ELSE’S FOLDER', async () => {
    await expect(
      asUser(
        INTRUDER,
        (tx) =>
          tx`insert into storage.objects (bucket_id, name, owner) values ('media', ${`${OWNER}/planted.png`}, ${INTRUDER})`,
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('AN INTRUDER CANNOT DELETE SOMEONE ELSE’S IMAGE', async () => {
    // Without a scoped delete policy this is a one-line way to destroy another person's
    // portfolio from a browser console.
    const deleted = await asUser(
      INTRUDER,
      (tx) => tx`delete from storage.objects where name = ${OWNER_PATH} returning name`,
    );
    expect(deleted).toHaveLength(0);

    const [still] = await sql`select name from storage.objects where name = ${OWNER_PATH}`;
    expect(still).toBeDefined();
  });

  it('an intruder cannot overwrite someone else’s image by renaming into their folder', async () => {
    const updated = await asUser(
      INTRUDER,
      (tx) =>
        tx`update storage.objects set name = ${`${OWNER}/hijacked.png`} where name = ${OWNER_PATH} returning name`,
    );
    expect(updated).toHaveLength(0);
  });

  it('the owner can delete their own image', async () => {
    const deleted = await asUser(
      OWNER,
      (tx) => tx`delete from storage.objects where name = ${OWNER_PATH} returning name`,
    );
    expect(deleted).toHaveLength(1);
  });

  it('a file at the bucket root, owned by nobody, is refused', async () => {
    // storage.foldername() returns an empty array for a path with no folder, so the policy's
    // [1] is NULL and the check fails. Worth pinning: it is the case where "your own folder"
    // has no answer at all.
    await expect(
      asUser(
        OWNER,
        (tx) =>
          tx`insert into storage.objects (bucket_id, name, owner) values ('media', 'loose-file.png', ${OWNER})`,
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('everyone can read, including signed-out visitors — the bucket is public by design', async () => {
    const rows = await sql.begin(async (tx) => {
      await tx.unsafe('SET LOCAL ROLE anon');
      await tx`select set_config('request.jwt.claims', ${JSON.stringify({ role: 'anon' })}, true)`;
      return tx`select name from storage.objects where bucket_id = 'media'`;
    });
    expect(rows).toHaveLength(1);
  });
});
