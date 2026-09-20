import Link from 'next/link';

import { switchRole } from '@/lib/actions/auth';

/**
 * Switch between roles the account already has, or add the missing one.
 *
 * No animation: this sits in the header and a user with both roles hits it many times a day.
 * Per the animation-frequency rule, anything seen tens of times a day should be reduced or
 * removed — a transition here would read as lag, not polish.
 */
export function RoleSwitcher({
  activeRole,
  hasTalent,
  hasClient,
}: {
  activeRole: 'talent' | 'client';
  hasTalent: boolean;
  hasClient: boolean;
}) {
  const hasBoth = hasTalent && hasClient;
  const other = activeRole === 'talent' ? 'client' : 'talent';

  if (!hasBoth) {
    return (
      <Link
        href="/settings/roles"
        className="rounded-[--radius-sm] px-3 py-1.5 text-sm text-text-muted hover:bg-surface-sunken hover:text-text"
      >
        Add {other} profile
      </Link>
    );
  }

  return (
    <form action={switchRole}>
      <input type="hidden" name="role" value={other} />
      <button
        className="rounded-[--radius-sm] border border-border-strong px-3 py-1.5 text-sm transition-colors duration-[--duration-fast] hover:bg-surface-sunken"
        title={`Currently viewing as ${activeRole}`}
      >
        Switch to {other}
      </button>
    </form>
  );
}
