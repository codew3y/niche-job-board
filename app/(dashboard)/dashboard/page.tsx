import { redirect } from 'next/navigation';

import { dashboardPath } from '@/lib/roles';
import { requireViewer } from '@/lib/supabase/session';

/**
 * /dashboard — the app home the logo points at. The proxy normally resolves it before this
 * renders (lib/supabase/route-policy.ts); this is the same decision for a request that reached
 * the page some other way.
 */
export default async function DashboardHome(): Promise<never> {
  const viewer = await requireViewer();
  redirect(dashboardPath(viewer.activeRole));
}
