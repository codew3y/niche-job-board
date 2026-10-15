import {
  CaretRight as ChevronRight,
  UserGear as UserRoundCog,
  Users,
} from '@phosphor-icons/react/ssr';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/card';
import { PageHeader, SectionHeading } from '@/components/ui/page-header';
import { ThemeChoice } from '@/components/ui/theme-toggle';
import { getSessionUser } from '@techselect/backend/supabase/session';

export const metadata: Metadata = { title: 'Settings' };

/**
 * The settings index. /privacy points people at "settings" in the abstract; this is the page
 * that word means. Appearance lives here inline: it is one control, and a page of its own would
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
      <PageHeader className="mb-0" title="Settings" />

      <nav aria-label="Settings sections">
        <Card className="divide-y divide-border-base overflow-hidden">
          {items.map(([href, title, blurb, Icon]) => (
            <Link
              key={href}
              href={href}
              className="group flex min-h-16 items-center gap-4 px-4 py-4 transition-colors duration-fast ease-out hover:bg-surface-sunken focus-visible:-outline-offset-2 sm:px-5"
            >
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-md bg-primary-subtle text-primary"
              >
                <Icon size={18} weight="duotone" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-text">{title}</span>
                <span className="block text-sm text-text-muted text-pretty">{blurb}</span>
              </span>
              <ChevronRight
                aria-hidden="true"
                size={18}
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
