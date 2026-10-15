import { ArrowLeft } from '@phosphor-icons/react/ssr';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { RoleSettings } from '@/components/settings/role-settings';
import { PageHeader } from '@/components/ui/page-header';
import { createClient } from '@techselect/backend/supabase/server';

export const metadata: Metadata = { title: 'Roles' };

/**
 * Add the second role to an existing account (§6, DoD "dual-role gate").
 *
 * Roles are separate profile tables linked to one auth user, never a column on the user,
 * which is exactly what makes this page a small feature rather than a data migration.
 */
export default async function RolesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('active_role, has_talent, has_client')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile) redirect('/select-role');

  return (
    <div className="max-w-3xl">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <Link
          href="/dashboard/settings"
          className="-ml-2 inline-flex min-h-10 items-center gap-1.5 rounded-md px-2 font-medium text-text-muted hover:bg-surface-sunken hover:text-text"
        >
          <ArrowLeft aria-hidden="true" size={16} /> Settings
        </Link>
      </nav>
      <PageHeader
        title="Roles"
        subtitle="One account, both sides. Adding a role never affects the one you already have."
      />
      <RoleSettings
        activeRole={profile.active_role}
        hasTalent={profile.has_talent}
        hasClient={profile.has_client}
      />
    </div>
  );
}
