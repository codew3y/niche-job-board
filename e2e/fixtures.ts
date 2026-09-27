import { createClient } from '@supabase/supabase-js';

/**
 * Real accounts for the E2E flows.
 *
 * Created through the Supabase admin API rather than by driving the signup form, for two
 * reasons: signup sends a confirmation email and waits for it, which is not what these tests
 * are measuring; and a test that depends on an inbox is a test that fails for reasons
 * unrelated to the code.
 *
 * `email_confirm: true` produces exactly the state a confirmed user is in — the same thing
 * clicking the link produces, without the link.
 *
 * Everything is namespaced with a run id and torn down afterwards. A fixture that survives a
 * failed run poisons the next one, and "it passes on a clean database" is not a property worth
 * having.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const canSeed = Boolean(url && serviceKey);

/**
 * Say which database this is running against, and say loudly when it cannot run at all.
 *
 * A suite that skips silently reports green while testing nothing — which is how the first
 * run of this file "passed" with 13 skipped tests.
 */
if (canSeed) {
  const host = url!.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const where = /127\.0\.0\.1|localhost/.test(host) ? 'LOCAL' : 'REMOTE';
  console.info(`[e2e] seeding against ${where} Supabase — ${host}`);
} else {
  console.warn(
    '[e2e] SKIPPING every flow: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing. ' +
      'This suite proves nothing in this state.',
  );
}

export function admin() {
  if (!url || !serviceKey) {
    throw new Error(
      'E2E fixtures need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. ' +
        'Without them the suite cannot create accounts and is skipped rather than passing.',
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const PASSWORD = 'e2e-Password-2026!';

export type Seeded = {
  runId: string;
  talent: { email: string; userId: string; profileId: string; slug: string };
  client: { email: string; userId: string; profileId: string };
  job: { id: string; slug: string; title: string };
};

/**
 * Remove fixtures left by a run that died before its teardown.
 *
 * Without this the database accumulates identically-worded profiles, and assertions that match
 * on visible text start failing strict mode for reasons that have nothing to do with the code
 * — which is exactly how the first green-ish run of this suite reported two false failures.
 */
async function clearStrays() {
  const db = admin();
  const { data } = await db.auth.admin.listUsers({ perPage: 200 });
  const strays = (data?.users ?? []).filter((u) => u.email?.startsWith('e2e-'));
  for (const u of strays) await db.auth.admin.deleteUser(u.id).catch(() => {});
  if (strays.length) console.info(`[e2e] cleared ${strays.length} stray fixture account(s)`);
}

export async function seed(): Promise<Seeded> {
  await clearStrays();
  const db = admin();
  const runId = Math.random().toString(36).slice(2, 8);

  const mk = async (role: string) => {
    const email = `e2e-${role}-${runId}@example.test`;
    const { data, error } = await db.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: `E2E ${role} ${runId}` },
    });
    if (error || !data.user) throw new Error(`could not create ${role}: ${error?.message}`);
    await db
      .from('user_profiles')
      .upsert({ user_id: data.user.id, display_name: `E2E ${role} ${runId}` });
    return { email, userId: data.user.id };
  };

  const talentUser = await mk('talent');
  const clientUser = await mk('client');

  const slug = `e2e-dev-${runId}`;
  const { data: talentProfile, error: tErr } = await db
    .from('talent_profiles')
    .insert({
      user_id: talentUser.userId,
      slug,
      headline: 'Stripe and Postgres developer for subscription billing',
      bio: 'I rebuild billing systems that have outgrown their first implementation. '.repeat(3),
      is_published: true,
      accepts_messages: true,
      availability: 'part_time',
      hourly_rate_min: '60',
      hourly_rate_max: '90',
    })
    .select('id')
    .single();
  if (tErr) throw new Error(`talent profile: ${tErr.message}`);

  const { data: clientProfile, error: cErr } = await db
    .from('client_profiles')
    .insert({ user_id: clientUser.userId, company_name: `E2E Co ${runId}` })
    .select('id')
    .single();
  if (cErr) throw new Error(`client profile: ${cErr.message}`);

  /**
   * The role the account actually signs in as.
   *
   * Inserting `client_profiles` alone leaves `active_role` at its 'talent' default, so the
   * "client" fixture signed in and got the DEVELOPER shell — talent nav, talent dashboard,
   * "Add client profile" in the header. Every nav assertion passed anyway, because both roles
   * use the same five labels and only the hrefs differ. Real signup sets this from the chosen
   * intent; the fixture has to as well, or it tests a state no user is ever in.
   */
  const { error: rErr } = await db
    .from('user_profiles')
    .update({ active_role: 'client' })
    .eq('user_id', clientUser.userId);
  if (rErr) throw new Error(`client active_role: ${rErr.message}`);

  const jobSlug = `e2e-job-${runId}`;
  const title = `Subscription billing rebuild ${runId}`;
  const { data: job, error: jErr } = await db
    .from('jobs')
    .insert({
      client_id: clientProfile.id,
      title,
      slug: jobSlug,
      description:
        'Our billing runs on a homegrown system that has outgrown itself. We want it moved onto Stripe subscriptions without losing history.',
      engagement_type: 'fixed',
      status: 'open',
      published_at: new Date().toISOString(),
      budget_min: '6000',
      budget_max: '9000',
    })
    .select('id')
    .single();
  if (jErr) throw new Error(`job: ${jErr.message}`);

  return {
    runId,
    talent: { ...talentUser, profileId: talentProfile.id, slug },
    client: { ...clientUser, profileId: clientProfile.id },
    job: { id: job.id, slug: jobSlug, title },
  };
}

export async function teardown(seeded: Seeded) {
  const db = admin();
  // Deleting the auth user cascades to every public row it owns, which is the property
  // lib/db/deletion.test.ts asserts. Using it here means the teardown also exercises it.
  for (const id of [seeded.talent.userId, seeded.client.userId]) {
    await db.auth.admin.deleteUser(id).catch(() => {});
  }
}
