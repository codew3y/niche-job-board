import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { AppShell, type ShellUser } from '@/components/layout/app-shell';
import { unreadCount } from '@/lib/services/messaging';
import { createClient } from '@/lib/supabase/server';

/**
 * Dashboard shell. Re-checks auth server-side rather than trusting middleware — middleware is
 * a convenience layer and can be bypassed (docs/api.md §1).
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('display_name, active_role, has_talent, has_client')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile || (!profile.has_talent && !profile.has_client)) redirect('/select-role');

  const shellUser: ShellUser = {
    displayName: profile.display_name,
    activeRole: profile.active_role,
    hasTalent: profile.has_talent,
    hasClient: profile.has_client,
    unread: await unreadCount(user.id),
  };

  return <AppShell user={shellUser}>{children}</AppShell>;
}
