import postgres from 'postgres';

/**
 * Fixtures built over a database connection instead of the Supabase admin API.
 *
 * e2e/fixtures.ts needs SUPABASE_SERVICE_ROLE_KEY, which for the hosted project lives only in
 * Vercel. The production run (M2) has DATABASE_URL and nothing else, so this creates the same
 * accounts in SQL.
 *
 * Creating a GoTrue user by hand needs more than a row in auth.users:
 *   - `encrypted_password` must be a bcrypt hash GoTrue can verify — pgcrypto's
 *     crypt(pw, gen_salt('bf')) produces exactly that
 *   - `email_confirmed_at` must be set, or sign-in is refused as unconfirmed
 *   - an `auth.identities` row with provider 'email' must exist. Current GoTrue looks the user
 *     up through identities, so a user without one authenticates as "no such account" — which
 *     looks like a wrong password and is the single easiest thing to get wrong here
 *   - `aud` and `role` must both be 'authenticated'
 *   - and every token column must be '' rather than NULL. This one costs an hour if you do
 *     not know it: GoTrue scans confirmation_token, recovery_token, email_change and the rest
 *     into non-nullable Go strings, so a NULL makes the lookup fail with
 *     "Database error querying schema" — a 500 that says nothing about passwords, while the
 *     UI shows "that email and password do not match an account". The row looks perfect in
 *     psql and the bcrypt hash verifies; the query never gets that far.
 */

export const PASSWORD = 'e2e-Password-2026!';

export type SqlSeeded = {
  runId: string;
  talent: { email: string; userId: string; profileId: string; slug: string };
  client: { email: string; userId: string; profileId: string };
  job: { id: string; slug: string; title: string };
};

export function connect(url: string) {
  return postgres(url, { max: 2, idle_timeout: 10, connect_timeout: 15, onnotice: () => {} });
}

async function createUser(sql: postgres.Sql, email: string, displayName: string) {
  const [user] = await sql`
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
      'authenticated', ${email}, crypt(${PASSWORD}, gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      ${sql.json({ display_name: displayName })},
      '', '', '', '', '', '', '', ''
    ) returning id`;

  const id = user!.id as string;

  // Without this, sign-in fails as though the account does not exist.
  await sql`
    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (${id}, ${id}, ${sql.json({ sub: id, email })}, 'email', now(), now(), now())`;

  await sql`insert into user_profiles (user_id, display_name) values (${id}, ${displayName})
            on conflict (user_id) do update set display_name = excluded.display_name`;

  return { email, userId: id };
}

export async function seedSql(sql: postgres.Sql): Promise<SqlSeeded> {
  await sql`create extension if not exists pgcrypto`;
  const runId = Math.random().toString(36).slice(2, 8);

  const talentUser = await createUser(sql, `m2-dev-${runId}@example.test`, `Maya Okonkwo`);
  const clientUser = await createUser(sql, `m2-client-${runId}@example.test`, `Daniel Reyes`);

  const slug = `m2-dev-${runId}`;
  const [talentProfile] = await sql`
    insert into talent_profiles (user_id, slug, headline, bio, is_published, accepts_messages,
                                 availability, hourly_rate_min, hourly_rate_max, currency, years_experience, timezone)
    values (${talentUser.userId}, ${slug},
            'Stripe and Postgres developer for subscription billing',
            ${'I rebuild billing systems that have outgrown their first implementation. Most recently I moved a marketplace off a homegrown subscription engine onto Stripe Billing without losing invoice history, and cut failed payments from 4.1% to 0.6%.'},
            true, true, 'part_time', 65, 95, 'USD', 8, 'Europe/Zurich')
    returning id`;

  const [clientProfile] = await sql`
    insert into client_profiles (user_id, company_name, about, industry)
    values (${clientUser.userId}, ${`Northwind Studio ${runId}`},
            'A small product studio running three SaaS products.', 'Software')
    returning id`;

  const jobSlug = `m2-job-${runId}`;
  const title = `Move subscription billing onto Stripe (${runId})`;
  const [job] = await sql`
    insert into jobs (client_id, title, slug, description, requirements, engagement_type,
                      status, published_at, budget_min, budget_max, currency, location_type, experience_level)
    values (${clientProfile!.id}, ${title}, ${jobSlug},
            ${'Our billing runs on a homegrown system that has outgrown itself. We want it moved onto Stripe subscriptions without losing invoice history, and we want the migration reversible while it runs.'},
            ${'Experience migrating a live billing system. Comfortable with Postgres and webhooks.'},
            'fixed', 'open', now(), 6000, 9000, 'USD', 'remote', 'senior')
    returning id`;

  return {
    runId,
    talent: { ...talentUser, profileId: talentProfile!.id as string, slug },
    client: { ...clientUser, profileId: clientProfile!.id as string },
    job: { id: job!.id as string, slug: jobSlug, title },
  };
}

export async function teardownSql(sql: postgres.Sql, seeded: SqlSeeded) {
  // Deleting the auth user cascades to every public row it owns — the property
  // lib/db/deletion.test.ts asserts, exercised here as cleanup.
  await sql`delete from auth.users where id in (${seeded.talent.userId}, ${seeded.client.userId})`;
}
