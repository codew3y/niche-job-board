'use client';

import { useId, useState, type KeyboardEvent } from 'react';

import { EmailPasswordForm } from './email-password-form';
import { OAuthButtons } from './oauth-buttons';
import { OrDivider } from './or-divider';
import { cn } from '@/lib/ui/cn';

type Tab = 'login' | 'signup';

/**
 * The login container on the landing page: Log in and Sign up as two tabs over the same
 * providers and the same email form, so a returning user who forgets which method they used is
 * never nudged into a second account.
 *
 * WAI-ARIA tabs: arrow keys move between them, and only the active tab is in the tab order.
 */
export function LandingAuth({
  initialTab = 'login',
  next,
  notice,
  error,
}: {
  initialTab?: Tab;
  /** Where to go after signing in (from a protected page's redirect). Path only. */
  next?: string;
  notice?: string;
  error?: string;
}) {
  const uid = useId();
  const [tab, setTab] = useState<Tab>(initialTab);
  const tabs: [Tab, string][] = [
    ['login', 'Log in'],
    ['signup', 'Sign up'],
  ];

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const nextTab: Tab = tab === 'login' ? 'signup' : 'login';
    setTab(nextTab);
    document.getElementById(`${uid}-tab-${nextTab}`)?.focus();
  };

  return (
    <div className="w-full max-w-sm rounded-lg border border-border-base bg-surface-raised p-6 text-left text-text sm:p-8">
      <div
        role="tablist"
        aria-label="Account"
        className="grid grid-cols-2 gap-1 rounded-md bg-surface-sunken p-1"
      >
        {tabs.map(([key, label]) => (
          <button
            key={key}
            id={`${uid}-tab-${key}`}
            type="button"
            role="tab"
            aria-selected={tab === key}
            aria-controls={`${uid}-panel`}
            tabIndex={tab === key ? 0 : -1}
            onClick={() => setTab(key)}
            onKeyDown={onKeyDown}
            className={cn(
              'h-9 rounded-md text-sm transition-colors duration-fast ease-out',
              tab === key
                ? 'bg-surface-raised font-semibold text-text'
                : 'text-text-muted hover:text-text',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        id={`${uid}-panel`}
        role="tabpanel"
        aria-labelledby={`${uid}-tab-${tab}`}
        className="mt-6"
      >
        {notice && (
          <p role="status" className="mb-5 text-sm text-text-muted text-pretty">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="mb-5 text-sm text-danger text-pretty">
            {error}
          </p>
        )}

        <OAuthButtons next={tab === 'login' ? next : undefined} />
        <OrDivider />
        {/* Keyed by tab so switching resets the form state instead of carrying a stale error. */}
        <EmailPasswordForm key={tab} mode={tab} next={tab === 'login' ? next : undefined} />
      </div>
    </div>
  );
}
