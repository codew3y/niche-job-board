import type { ReactNode } from 'react';

import { AppShell } from '@/components/layout/app-shell';
import { loadShellUser } from '@techselect/backend/services/shell';
import { requireViewer } from '@techselect/backend/supabase/session';

/**
 * Dashboard shell. Re-checks auth server-side rather than trusting the proxy — the proxy is a
 * convenience layer and can be bypassed. The role comes from `requireViewer`,
 * the one place it is read.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const viewer = await requireViewer();
  return <AppShell user={await loadShellUser(viewer)}>{children}</AppShell>;
}
