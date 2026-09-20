import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { RoleSettings } from '@/components/settings/role-settings';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Roles' };

/**
 * Add the second role to an existing account (§6, DoD "dual-role gate").
 *
 * Roles are separate profile tables linked to one auth user, never a column on the user —
 * which is exactly what makes this page a small feature rather than a data migration.
 */
export default async function RolesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('active_role, has_talent, has_client')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile) redirect('/select-role');

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Roles</h1>
        <p className="mt-1 text-text-muted text-pretty">
          One account, both sides. Adding a role never affects the one you already have.
        </p>
      </div>
      <RoleSettings
        activeRole={profile.active_role}
        hasTalent={profile.has_talent}
        hasClient={profile.has_client}
      />
    </div>
  );
}
