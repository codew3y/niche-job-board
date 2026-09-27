import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { DeleteAccount } from '@/components/settings/delete-account';
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
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="mt-1 text-text-muted text-pretty">
          Signed in as <span className="text-text">{user.email}</span>.
        </p>
      </div>

      <section className="space-y-4 rounded-md border border-danger/40 p-5">
        <div>
          <h2 className="font-medium text-danger">Delete your account</h2>
          {/* The same words as /privacy, on purpose. A deletion screen that describes the
              behaviour differently from the policy is how the two quietly diverge. */}
          <p className="mt-1.5 text-sm text-text-muted text-pretty">
            Your profile, portfolio, uploads, job posts, applications, saved lists and blocks are
            removed. This cannot be undone.
          </p>
          <p className="mt-2 text-sm text-text-muted text-pretty">
            Conversations are the deliberate exception. A thread has two owners, so it survives with
            your side tombstoned: your name is detached and your messages are replaced with a note
            saying the account was deleted. The other person keeps their own words and cannot
            recover yours. This is set out in the{' '}
            <Link href="/privacy" className="prose-link font-medium">
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
