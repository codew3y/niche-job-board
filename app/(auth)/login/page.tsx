import Link from 'next/link';
import type { Metadata } from 'next';

import { AuthCard, OrDivider } from '@/components/auth/auth-card';
import { OAuthButtons } from '@/components/auth/oauth-buttons';
import { EmailPasswordForm } from '@/components/auth/email-password-form';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  // Only accept a path. An absolute URL here would be an open redirect.
  const safeNext = next?.startsWith('/') && !next.startsWith('//') ? next : undefined;

  return (
    <AuthCard
      title="Sign in"
      subtitle="Welcome back."
      footer={
        <>
          New here?{' '}
          <Link href="/signup" className="text-accent underline underline-offset-2">
            Create an account
          </Link>
        </>
      }
    >
      <OAuthButtons next={safeNext} />
      <OrDivider />
      <EmailPasswordForm mode="login" next={safeNext} />
    </AuthCard>
  );
}
