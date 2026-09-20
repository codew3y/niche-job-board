import type { Metadata } from 'next';

import { AuthCard } from '@/components/auth/auth-card';
import { RoleChooser } from '@/components/auth/role-chooser';

export const metadata: Metadata = { title: 'Choose how you’ll use this' };

export default function SelectRolePage() {
  return (
    <AuthCard
      title="How will you use this?"
      subtitle="You can add the other one later from settings — one account holds both."
    >
      <RoleChooser />
    </AuthCard>
  );
}
