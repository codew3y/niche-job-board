import type { Metadata } from 'next';

import { AuthCard } from '@/components/auth/auth-card';
import { SetPasswordForm } from '@/components/auth/password-forms';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Set a new password' };

export default async function ConfirmResetPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // An account created through Google or GitHub has no password. The same screen sets a
  // first one rather than "changing" a password that never existed (ADR-007 D1).
  const hasPassword = Boolean(
    (user?.identities ?? []).some((i) => i.provider === 'email'),
  );

  if (!user) {
    return (
      <AuthCard
        title="That link has expired"
        subtitle="Reset links are valid for one hour and can only be used once."
      >
        <a href="/reset-password" className="text-accent hover:underline">
          Request a new one
        </a>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={hasPassword ? 'Set a new password' : 'Set a password'}
      subtitle={
        hasPassword
          ? 'Pick something you have not used elsewhere.'
          : 'You signed up with Google or GitHub, so you do not have a password yet. Adding one gives you a second way in — those buttons keep working either way.'
      }
    >
      <SetPasswordForm />
    </AuthCard>
  );
}
