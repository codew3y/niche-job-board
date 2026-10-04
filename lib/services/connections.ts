import 'server-only';

import { createClient } from '../supabase/server';

/**
 * The signed-in developer's connected GitHub and LinkedIn accounts, for the profile editor and
 * the onboarding links step.
 *
 * Read from the session's own identities (auth.identities, via getUser), not from the profile
 * columns: the identity is the truth, and the columns are the public copy that
 * sync_connected_accounts() maintains (migration 0021).
 */
export type Connections = {
  github: { connected: boolean; login: string | null; canDisconnect: boolean };
  linkedin: { connected: boolean; name: string | null; canDisconnect: boolean };
};

export async function getConnections(): Promise<Connections> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const identities = user?.identities ?? [];
  const find = (provider: string) => identities.find((i) => i.provider === provider);
  const gh = find('github');
  const li = find('linkedin_oidc');
  const data = (i: typeof gh) => (i?.identity_data ?? {}) as Record<string, unknown>;
  const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

  // An account must keep at least one way to sign in. Email/password counts when the user has
  // an email identity; an OAuth-only account cannot drop its last provider.
  const canDisconnect = identities.length > 1;

  return {
    github: {
      connected: Boolean(gh),
      login: text(data(gh).user_name) ?? text(data(gh).preferred_username),
      canDisconnect: Boolean(gh) && canDisconnect,
    },
    linkedin: {
      connected: Boolean(li),
      name: text(data(li).name) ?? text(data(li).full_name),
      canDisconnect: Boolean(li) && canDisconnect,
    },
  };
}
