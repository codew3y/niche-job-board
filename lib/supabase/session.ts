import 'server-only';

import { cache } from 'react';

import { createClient } from './server';

/**
 * The session, fetched at most ONCE per request.
 *
 * `supabase.auth.getUser()` is a network round trip on purpose — it revalidates the token with
 * the auth server, unlike `getSession()`, which trusts a forgeable cookie. That makes it the
 * right call and an expensive one to repeat.
 *
 * Rendering /jobs was making four of them: the layout for its header, then `canSave()`, then
 * `savedJobIds()`, each independently asking who the user was. At roughly 150-250ms per round
 * trip that was most of the page's time, and none of the repeats could return a different
 * answer within one render.
 *
 * React's `cache()` dedupes per REQUEST, not globally — a distinction that matters here more
 * than anywhere else in the codebase. A module-level variable would leak one visitor's session
 * into another's response on a warm serverless instance, which is the worst bug this file
 * could possibly have. `cache()` is scoped to a single render and thrown away with it.
 *
 * NOT shared with middleware: that runs in a separate context before rendering begins, so its
 * lookup is genuinely a different request. It stays as it is.
 */
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export type SessionProfile = {
  userId: string;
  displayName: string;
  activeRole: 'talent' | 'client';
  hasTalent: boolean;
  hasClient: boolean;
} | null;

/**
 * The signed-in user's profile row, also once per request.
 *
 * The header needs it for the role switcher, the landing page needs it to decide where to
 * point, and several pages need it to know which role is active. Three reads of a row that
 * cannot change mid-render.
 */
export const getSessionProfile = cache(async (): Promise<SessionProfile> => {
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from('user_profiles')
    .select('display_name, active_role, has_talent, has_client')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!data) return null;
  return {
    userId: user.id,
    displayName: data.display_name,
    activeRole: data.active_role as 'talent' | 'client',
    hasTalent: data.has_talent,
    hasClient: data.has_client,
  };
});

/**
 * The talent profile id for the signed-in user, or null.
 *
 * Cached for the same reason: `canSave('job')` and `savedJobIds()` both needed it on the same
 * render of the same page, and each was fetching it separately.
 */
export const getTalentProfileId = cache(async (): Promise<string | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from('talent_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  return data?.id ?? null;
});

export const getClientProfileId = cache(async (): Promise<string | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from('client_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  return data?.id ?? null;
});
