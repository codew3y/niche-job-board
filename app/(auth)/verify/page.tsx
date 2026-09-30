import { MailCheck } from 'lucide-react';
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
          <MailCheck size={20} />
        </span>
        <p className="text-sm text-text-muted text-pretty">
          Nothing arrived? Check spam, or{' '}
          <Link href="/signup" className="font-semibold text-link underline underline-offset-4">
            try again
          </Link>
          . Signing in with Google or GitHub skips this step entirely.
        </p>
      </div>
    </AuthCard>
  );
}
