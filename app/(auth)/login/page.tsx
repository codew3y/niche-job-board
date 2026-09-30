import Link from 'next/link';
import type { Metadata } from 'next';

import { AuthCard, OrDivider } from '@/components/auth/auth-card';
import { OAuthButtons } from '@/components/auth/oauth-buttons';
import { EmailPasswordForm } from '@/components/auth/email-password-form';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  // Only accept a path. An absolute URL here would be an open redirect.
  const safeNext = next?.startsWith('/') && !next.startsWith('//') ? next : undefined;

  return (
    <AuthCard
      title="Sign in"
      subtitle="Welcome back."
      footer={
        <>
          New here?{' '}
          <Link href="/signup" className="prose-link font-semibold">
            Create an account
          </Link>
        </>
      }
    >
      {/* OAuth failures redirect here with ?error= (app/auth/callback, lib/actions/auth.ts). */}
      {error && (
        <p role="alert" className="mb-5 text-sm text-danger text-pretty">
          {error}
        </p>
      )}
      <OAuthButtons next={safeNext} />
      <OrDivider />
      <EmailPasswordForm mode="login" next={safeNext} />
    </AuthCard>
  );
}
