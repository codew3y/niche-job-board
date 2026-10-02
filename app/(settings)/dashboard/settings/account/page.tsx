import { ArrowLeft } from '@phosphor-icons/react/ssr';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { DeleteAccount } from '@/components/settings/delete-account';
import { PageHeader } from '@/components/ui/page-header';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Account' };

/**
 * Where the deletion promise in /privacy is actually kept.
 *
 * It said "delete your account from settings at any time" while no such control existed
 * anywhere in the product. This page is that control.
 */
export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect('/login');

  return (
    <div className="max-w-3xl space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link
          href="/dashboard/settings"
          className="-ml-2 inline-flex min-h-10 items-center gap-1.5 rounded-md px-2 font-medium text-text-muted hover:bg-surface-sunken hover:text-text"
        >
          <ArrowLeft aria-hidden="true" size={16} /> Settings
        </Link>
      </nav>

      <PageHeader
        className="mb-0"
        title="Account"
        subtitle={
          <>
            Signed in as <span className="font-semibold text-text">{user.email}</span>.
          </>
        }
      />

      <section
        aria-labelledby="delete-heading"
        className="space-y-5 rounded-lg border border-danger/30 bg-surface-raised p-5 sm:p-6"
      >
        <div>
          <h2 id="delete-heading" className="text-lg font-semibold tracking-tight text-danger">
            Delete your account
          </h2>
          {/* The same words as /privacy, on purpose. A deletion screen that describes the
              behaviour differently from the policy is how the two quietly diverge. */}
          <p className="mt-2 text-sm text-text-muted text-pretty">
            Your profile, portfolio, uploads, job posts, applications, saved lists and blocks are
            removed. This cannot be undone.
          </p>
          <p className="mt-2 text-sm text-text-muted text-pretty">
            Conversations are the deliberate exception. A thread has two owners, so it survives with
            your side tombstoned: your name is detached and your messages are replaced with a note
            saying the account was deleted. The other person keeps their own words and cannot
            recover yours. This is set out in the{' '}
            <Link href="/privacy" className="prose-link font-semibold">
              privacy policy
            </Link>
            .
          </p>
        </div>

        <DeleteAccount email={user.email} />
      </section>
    </div>
  );
}
