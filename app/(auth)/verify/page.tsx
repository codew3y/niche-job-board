import { EnvelopeSimple } from '@phosphor-icons/react/ssr';
import type { Metadata } from 'next';
import Link from 'next/link';

import { AuthCard } from '@/components/auth/auth-card';

export const metadata: Metadata = { title: 'Check your email' };

export default function VerifyPage() {
  return (
    <AuthCard
      title="Check your email"
      subtitle="We've sent you a link to confirm your address. It expires in an hour."
    >
      <div className="flex gap-4">
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-md bg-primary-subtle text-primary"
        >
          <EnvelopeSimple size={20} weight="duotone" />
        </span>
        <p className="text-sm text-text-muted">
          Nothing arrived? Check spam, or{' '}
          <Link href="/signup" className="prose-link font-medium text-text">
            try again
          </Link>
          . Signing in with Google or GitHub skips this step entirely.
        </p>
      </div>
    </AuthCard>
  );
}
