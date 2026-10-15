'use client';

import { useState } from 'react';

import { controlStyles } from '@/components/ui/field';
import { cn } from '@/lib/ui/cn';

import { ExternalLink } from '@/components/shared/external-link';

/**
 * Live preview of the external links, as they will appear on the public profile.
 *
 * Why this is worth building rather than trusting the fields: these three links are the only
 * evidence some profiles carry, they are the main untrusted-input surface in the product
 * (§5.4), and the rules that govern them are invisible while typing. Someone pastes
 * `github.com/name`, sees no complaint because they have not submitted yet, and finds out it
 * was rejected only after saving.
 *
 * The preview renders through the SAME `ExternalLink` component the public profile uses, so
 * it cannot show something the real page would not — including the https guard, which is what
 * makes a pasted `javascript:` or `http://` link render as nothing here.
 *
 * It deliberately does not "fix" input. Silently upgrading `github.com/x` to `https://…` would
 * teach people the field accepts a bare domain, and the server would still refuse it.
 */

const MESSAGE: Record<string, string> = {
  'not-https': 'Needs to be https://. An http:// link will be refused when you save.',
  malformed: 'Not a full link yet. Include https:// at the start.',
};

function status(value: string): 'empty' | 'ok' | 'not-https' | 'malformed' {
  const v = value.trim();
  if (!v) return 'empty';
  try {
    return new URL(v).protocol === 'https:' ? 'ok' : 'not-https';
  } catch {
    return 'malformed';
  }
}

/**
 * The portfolio site field with its live preview. GitHub and LinkedIn are no longer typed
 * links: they are connected accounts (frontend/components/talent/connected-accounts.tsx).
 */
export function LinksPreview({ initial }: { initial: { website: string } }) {
  const [website, setWebsite] = useState(initial.website);
  const state = status(website);

  return (
    <div className="space-y-1.5">
      <label htmlFor="link-website" className="block text-sm font-semibold">
        Portfolio site
      </label>
      <input
        id="link-website"
        name="websiteUrl"
        type="url"
        inputMode="url"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        placeholder="Portfolio Link"
        aria-invalid={state === 'not-https' || state === 'malformed'}
        aria-describedby="link-website-status"
        className={cn(
          controlStyles,
          'h-11 px-3.5',
          state === 'not-https' || state === 'malformed'
            ? 'border-danger'
            : 'border-control hover:border-text-subtle',
        )}
      />
      <p
        id="link-website-status"
        className={`text-sm ${state === 'ok' || state === 'empty' ? 'text-text-muted' : 'text-danger'}`}
      >
        {state === 'ok' ? (
          <>
            On your public profile as{' '}
            {/* Rendered by the same component the real page uses, so the preview cannot show
                a link the profile would refuse. */}
            <ExternalLink href={website.trim()} className="font-semibold">
              Portfolio
            </ExternalLink>
          </>
        ) : (
          (MESSAGE[state] ?? 'Optional. A link to work you have shipped, hosted anywhere.')
        )}
      </p>
    </div>
  );
}
