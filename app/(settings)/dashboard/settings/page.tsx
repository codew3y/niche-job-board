import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getSessionUser } from '@/lib/supabase/session';

export const metadata: Metadata = { title: 'Settings' };

/**
 * An index, so /dashboard/settings is not a 404 between two pages that both live under it.
 *
 * /privacy points people at "settings" in the abstract; this is the page that word means.
 */
export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const items = [
    ['/dashboard/settings/roles', 'Roles', 'One account, both sides. Add or switch roles.'],
    ['/dashboard/settings/account', 'Account', 'Your sign-in address, and deleting your account.'],
  ] as const;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      </div>
      <nav aria-label="Settings" className="grid gap-3">
        {items.map(([href, title, blurb]) => (
          <Link
            key={href}
            href={href}
            className="rounded-md border border-border-base p-4 transition-colors duration-fast hover:bg-surface-sunken"
          >
            <span className="font-medium">{title}</span>
            <span className="mt-0.5 block text-sm text-text-muted text-pretty">{blurb}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
