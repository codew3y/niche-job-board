import type { ReactNode } from 'react';

import { AppShell } from '@/components/layout/app-shell';
import { loadShellUser } from '@/lib/services/shell';
import { requireViewer } from '@/lib/supabase/session';

/**
 * Dashboard shell. Re-checks auth server-side rather than trusting the proxy — the proxy is a
 * convenience layer and can be bypassed (docs/api.md §1). The role comes from `requireViewer`,
 * the one place it is read.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const viewer = await requireViewer();
  return <AppShell user={await loadShellUser(viewer)}>{children}</AppShell>;
}
