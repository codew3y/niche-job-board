import Link from 'next/link';
import type { Metadata } from 'next';

import { AuthCard, OrDivider } from '@/components/auth/auth-card';
import { OAuthButtons } from '@/components/auth/oauth-buttons';
import { EmailPasswordForm } from '@/components/auth/email-password-form';

export const metadata: Metadata = { title: 'Create an account' };

export default function SignupPage() {
  return (
    <AuthCard
      title="Create an account"
      subtitle="You'll pick Talent or Client next — and you can add the other later."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="text-accent underline underline-offset-2">
            Sign in
          </Link>
        </>
      }
    >
      {/* Same providers, same order as the sign-in screen: a returning user who forgets
          which method they used must not be nudged into a second account. */}
      <OAuthButtons />
      <OrDivider />
      <EmailPasswordForm mode="signup" />
    </AuthCard>
  );
}
