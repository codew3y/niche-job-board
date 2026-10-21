import Link from 'next/link';
import type { Metadata } from 'next';

import { AuthCard, OrDivider } from '@/components/auth/auth-card';
import { OAuthButtons } from '@/components/auth/oauth-buttons';
import { EmailPasswordForm } from '@/components/auth/email-password-form';
import { FormError } from '@/components/ui/field';
import { safePath } from '@techselect/backend/security/safe-path';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  // Only accept a path. An absolute URL here would be an open redirect.
  const safeNext = safePath(next) ?? undefined;

  return (
    <AuthCard
      title="Sign in"
      subtitle="Welcome back."
      photo="login"
      footer={
        <>
          New here?{' '}
          <Link href="/signup" className="prose-link font-medium text-text">
            Create an account
          </Link>
        </>
      }
    >
      {/* OAuth failures redirect here with ?error= (frontend/app/auth/callback, frontend/lib/actions/auth.ts). */}
      {error && (
        <div className="mb-6">
          <FormError>{error}</FormError>
        </div>
      )}
      <OAuthButtons next={safeNext} />
      <OrDivider />
      <EmailPasswordForm mode="login" next={safeNext} />
    </AuthCard>
  );
}
