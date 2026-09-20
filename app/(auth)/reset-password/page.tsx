import Link from 'next/link';
import type { Metadata } from 'next';

import { AuthCard } from '@/components/auth/auth-card';
import { ResetRequestForm } from '@/components/auth/password-forms';

export const metadata: Metadata = { title: 'Reset your password' };

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Reset your password"
      subtitle="We'll email you a link to set a new one."
      footer={
        <Link href="/login" className="text-accent hover:underline">
          Back to sign in
        </Link>
      }
    >
      <ResetRequestForm />
    </AuthCard>
  );
}
