import type { Metadata } from 'next';

import { AuthCard } from '@/components/auth/auth-card';

export const metadata: Metadata = { title: 'Check your email' };

export default function VerifyPage() {
  return (
    <AuthCard
      title="Check your email"
      subtitle="We've sent you a link to confirm your address. It expires in an hour."
    >
      <p className="text-sm text-text-muted">
        Nothing arrived? Check spam, or{' '}
        <a href="/signup" className="prose-link font-semibold">
          try again
        </a>
        . Signing in with Google or GitHub skips this step entirely.
      </p>
    </AuthCard>
  );
}
