/**
 * Connected GitHub and LinkedIn accounts (migration 0021), against the database.
 *
 * The property under test is that a "connected" mark cannot be faked. A developer may update
 * their own profile row (talent_update_own), so without the guard trigger anyone could set
 * github_connected_at, or point github_url at someone else's account, straight through the API.
 * Only sync_connected_accounts(), which reads auth.identities, may write those columns.
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

const DEV = 'c0c0c0c0-c0c0-4c0c-8c0c-c0c0c0c0c0c0';

async function asUser<T>(userId: string, fn: (tx: postgres.TransactionSql) => Promise<T>) {
  return sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL ROLE authenticated`);
    await tx`select set_config('request.jwt.claim.sub', ${userId}, true)`;
    await tx`select set_config('request.jwt.claims',
                               ${JSON.stringify({ sub: userId, role: 'authenticated' })}, true)`;
    return fn(tx);
  }) as Promise<T>;
}

async function addIdentity(provider: string, data: Record<string, string>) {
  await sql`insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
            values (${`${provider}-${DEV}`}, ${DEV}, ${sql.json(data)}, ${provider}, now(), now())`;
}

const row = async () =>
  (
    await sql`select github_url, github_connected_at, linkedin_url, linkedin_connected_at
              from talent_profiles where user_id = ${DEV}`
  )[0]!;

const maybe = reachable ? describe : describe.skip;
itAnnouncesTarget(sql, DB_URL);

beforeEach(async () => {
  if (!reachable) return;
  await sql`delete from auth.users where id = ${DEV}`;
  await sql`insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
            values (${DEV}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
                    'connected-dev@example.test', 'x', now(), now())`;
  await sql`insert into user_profiles (user_id, display_name) values (${DEV}, 'Connected Dev')`;
  await sql`insert into talent_profiles (user_id, slug, headline, bio)
            values (${DEV}, 'connected-dev', 'Integration developer', '')`;
});

afterAll(async () => {
  if (reachable) await sql`delete from auth.users where id = ${DEV}`;
  await sql.end();
});

maybe('a connection cannot be faked through the API', () => {
  it('REFUSES setting github_connected_at directly', async () => {
    await expect(
      asUser(
        DEV,
        (tx) => tx`update talent_profiles set github_connected_at = now() where user_id = ${DEV}`,
      ),
    ).rejects.toThrow(/set by signing in/);
  });

  it('REFUSES pointing github_url at an account the developer has not connected', async () => {
    await expect(
      asUser(
        DEV,
        (tx) =>
          tx`update talent_profiles set github_url = 'https://github.com/torvalds' where user_id = ${DEV}`,
      ),
    ).rejects.toThrow(/set by signing in/);
  });

  it('REFUSES a LinkedIn link before LinkedIn is connected', async () => {
    await expect(
      asUser(
        DEV,
        (tx) =>
          tx`update talent_profiles set linkedin_url = 'https://www.linkedin.com/in/someone' where user_id = ${DEV}`,
      ),
    ).rejects.toThrow(/Connect LinkedIn/);
  });

  it('still lets the developer edit everything else on their row', async () => {
    await asUser(
      DEV,
      (tx) =>
        tx`update talent_profiles set headline = 'Automation engineer' where user_id = ${DEV}`,
    );
    expect(
      (await sql`select headline from talent_profiles where user_id = ${DEV}`)[0]!.headline,
    ).toBe('Automation engineer');
  });
});

maybe('sync_connected_accounts reads the identities', () => {
  it('connects GitHub and takes the address from the identity, not from input', async () => {
    await addIdentity('github', { user_name: 'maria-santos', sub: '123' });
    await asUser(DEV, (tx) => tx`select sync_connected_accounts()`);
    const r = await row();
    expect(r.github_url).toBe('https://github.com/maria-santos');
    expect(r.github_connected_at).not.toBeNull();
  });

  it('lets a connected LinkedIn account add its link, and clears it on disconnect', async () => {
    await addIdentity('linkedin_oidc', { name: 'Maria Santos', sub: 'li-1' });
    await asUser(DEV, (tx) => tx`select sync_connected_accounts()`);
    await asUser(
      DEV,
      (tx) =>
        tx`update talent_profiles set linkedin_url = 'https://www.linkedin.com/in/mariasantos' where user_id = ${DEV}`,
    );
    expect((await row()).linkedin_url).toBe('https://www.linkedin.com/in/mariasantos');

    await sql`delete from auth.identities where user_id = ${DEV} and provider = 'linkedin_oidc'`;
    await asUser(DEV, (tx) => tx`select sync_connected_accounts()`);
    const r = await row();
    expect(r.linkedin_connected_at).toBeNull();
    expect(r.linkedin_url).toBeNull();
  });

  it('disconnecting GitHub removes the address it provided', async () => {
    await addIdentity('github', { user_name: 'maria-santos', sub: '123' });
    await asUser(DEV, (tx) => tx`select sync_connected_accounts()`);
    await sql`delete from auth.identities where user_id = ${DEV} and provider = 'github'`;
    await asUser(DEV, (tx) => tx`select sync_connected_accounts()`);
    const r = await row();
    expect(r.github_url).toBeNull();
    expect(r.github_connected_at).toBeNull();
  });

  it('ignores a username that is not a valid GitHub login, rather than building a bad URL', async () => {
    await addIdentity('github', { user_name: 'evil/../path', sub: '9' });
    await asUser(DEV, (tx) => tx`select sync_connected_accounts()`);
    const r = await row();
    expect(r.github_url).toBeNull();
    expect(r.github_connected_at).not.toBeNull();
  });

  it('a new profile row starts unconnected even if the insert tries otherwise', async () => {
    await sql`delete from talent_profiles where user_id = ${DEV}`;
    await asUser(
      DEV,
      (
        tx,
      ) => tx`insert into talent_profiles (user_id, slug, headline, bio, github_url, github_connected_at)
                 values (${DEV}, 'connected-dev', 'Integration developer', '',
                         'https://github.com/torvalds', now())`,
    );
    const r = await row();
    expect(r.github_url).toBeNull();
    expect(r.github_connected_at).toBeNull();
  });
});
