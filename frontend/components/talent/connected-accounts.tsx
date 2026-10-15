'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { GitHubIcon, LinkedInIcon } from '@/components/shared/brand-icons';
import { ExternalLink } from '@/components/shared/external-link';
import { Button } from '@/components/ui/button';
import { Field, FormError } from '@/components/ui/field';
import { disconnectAccount } from '@/lib/actions/connections';
import type { Connections } from '@techselect/backend/services/connections';
import { createClient } from '@/lib/supabase/client';

/**
 * GitHub and LinkedIn as connected accounts, not typed links.
 *
 * "Connect GitHub" / "Connect LinkedIn" start an OAuth round trip with Supabase's identity
 * linking (`linkIdentity`): the developer signs in to the provider, it is linked to their
 * TechSelect account, and /auth/callback runs sync_connected_accounts() to write the public
 * copy (migration 0021). So a GitHub link on a profile is an account its owner proved they hold.
 *
 * GitHub returns a username, so its profile address is filled automatically. LinkedIn's sign-in
 * does not return a profile address, so once connected the developer pastes their
 * linkedin.com/in/ link here; the database refuses one on an unconnected account.
 *
 * Rendered INSIDE the profile and onboarding forms, so it never nests a <form>: Connect is a
 * plain button, Disconnect is a submit button with its own `formAction`, and the LinkedIn link
 * is a normal field submitted with the surrounding form (`linkedinUrl`).
 */
export function ConnectedAccounts({
  connections,
  linkedinUrl,
  linkedinErrors,
}: {
  connections: Connections;
  linkedinUrl: string;
  linkedinErrors?: string[];
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, setPending] = useState<'github' | 'linkedin_oidc' | null>(null);
  const [error, setError] = useState<string | null>(params.get('connect_error'));

  const connect = async (provider: 'github' | 'linkedin_oidc') => {
    setPending(provider);
    setError(null);
    const supabase = createClient();
    const { error: linkError } = await supabase.auth.linkIdentity({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?link=1&next=${encodeURIComponent(pathname)}`,
      },
    });
    // On success the browser is already leaving for the provider. An error means it never left.
    if (linkError) {
      setPending(null);
      setError(
        /not enabled|unsupported provider/i.test(linkError.message)
          ? `${provider === 'github' ? 'GitHub' : 'LinkedIn'} connections are not switched on yet.`
          : 'Could not start the connection. Try again.',
      );
    }
  };

  const disconnect = (provider: 'github' | 'linkedin', label: string) => (
    <Button
      type="submit"
      variant="ghost"
      size="sm"
      formAction={disconnectAccount}
      formNoValidate
      name="provider"
      value={provider}
      aria-label={`Disconnect ${label}`}
    >
      Disconnect
    </Button>
  );

  const githubUrl = connections.github.login
    ? `https://github.com/${connections.github.login}`
    : null;

  return (
    <fieldset className="space-y-3">
      <legend className="mb-1 text-sm font-semibold">Connected accounts</legend>
      <p className="text-sm text-text-muted text-pretty">
        Connect your accounts so clients know they are really yours. Each one shows on your public
        profile with a &ldquo;Connected&rdquo; mark.
      </p>
      <input type="hidden" name="returnTo" value={pathname} />

      {error && <FormError>{error}</FormError>}

      {/* GitHub */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-base bg-surface-raised p-3 sm:p-4">
        {connections.github.connected ? (
          <>
            <p className="flex min-w-0 items-center gap-3 text-sm">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-surface-sunken text-text">
                <GitHubIcon />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">GitHub connected</span>
                {githubUrl ? (
                  <ExternalLink href={githubUrl} className="text-text-muted">
                    @{connections.github.login}
                  </ExternalLink>
                ) : (
                  <span className="text-text-muted">Username unavailable</span>
                )}
              </span>
            </p>
            {connections.github.canDisconnect && disconnect('github', 'GitHub')}
          </>
        ) : (
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={() => connect('github')}
            disabled={pending !== null}
            aria-busy={pending === 'github'}
          >
            <GitHubIcon />
            {pending === 'github' ? 'Opening GitHub…' : 'Connect GitHub'}
          </Button>
        )}
      </div>

      {/* LinkedIn */}
      <div className="space-y-3 rounded-lg border border-border-base bg-surface-raised p-3 sm:p-4">
        {connections.linkedin.connected ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex min-w-0 items-center gap-3 text-sm">
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-surface-sunken text-text">
                  <LinkedInIcon />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold">LinkedIn connected</span>
                  {connections.linkedin.name && (
                    <span className="text-text-muted">{connections.linkedin.name}</span>
                  )}
                </span>
              </p>
              {connections.linkedin.canDisconnect && disconnect('linkedin', 'LinkedIn')}
            </div>
            <Field
              label="LinkedIn profile link"
              name="linkedinUrl"
              type="url"
              inputMode="url"
              placeholder="https://www.linkedin.com/in/your-name"
              defaultValue={linkedinUrl}
              errors={linkedinErrors}
              hint="LinkedIn does not share your profile address when you connect, so paste it here once."
            />
          </>
        ) : (
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={() => connect('linkedin_oidc')}
            disabled={pending !== null}
            aria-busy={pending === 'linkedin_oidc'}
          >
            <LinkedInIcon />
            {pending === 'linkedin_oidc' ? 'Opening LinkedIn…' : 'Connect LinkedIn'}
          </Button>
        )}
      </div>
    </fieldset>
  );
}
