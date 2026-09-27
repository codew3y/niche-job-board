import { ArrowRight, UserRoundCog, Users } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/card';
import { PageHeader, SectionHeading } from '@/components/ui/page-header';
import { ThemeChoice } from '@/components/ui/theme-toggle';
import { getSessionUser } from '@/lib/supabase/session';

export const metadata: Metadata = { title: 'Settings' };

/**
 * The settings index. /privacy points people at "settings" in the abstract; this is the page
 * that word means. Appearance lives here inline — it is one control, and a page of its own would
 * be a click for nothing.
 */
export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const items = [
    ['/dashboard/settings/roles', 'Roles', 'One account, both sides. Add or switch roles.', Users],
    [
      '/dashboard/settings/account',
      'Account',
      'Your sign-in address, and deleting your account.',
      UserRoundCog,
    ],
  ] as const;

  return (
    <div className="max-w-3xl space-y-10">
      <PageHeader title="Settings" />

      <nav aria-label="Settings">
        <Card className="divide-y divide-border-base">
          {items.map(([href, title, blurb, Icon]) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-4 px-5 py-4 transition-colors duration-fast ease-out first:rounded-t-lg last:rounded-b-lg hover:bg-surface-sunken/60"
            >
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-sunken text-text-subtle"
              >
                <Icon size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{title}</span>
                <span className="block text-sm text-text-muted text-pretty">{blurb}</span>
              </span>
              <ArrowRight
                aria-hidden="true"
                size={16}
                className="shrink-0 text-text-subtle transition-transform duration-fast ease-out group-hover:translate-x-0.5"
              />
            </Link>
          ))}
        </Card>
      </nav>

      <section aria-labelledby="appearance-heading">
        <SectionHeading
          id="appearance-heading"
          title="Appearance"
          description="System follows your device, and changes with it."
        />
        <ThemeChoice />
      </section>
    </div>
  );
}
