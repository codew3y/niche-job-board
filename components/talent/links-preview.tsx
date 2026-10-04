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

type LinkState = { website: string; github: string; linkedin: string };

const LABELS: { key: keyof LinkState; label: string; hint: string }[] = [
  { key: 'website', label: 'Portfolio website', hint: 'https://mariasantos.dev' },
  { key: 'github', label: 'GitHub', hint: 'https://github.com/mariasantos' },
  { key: 'linkedin', label: 'LinkedIn', hint: 'https://www.linkedin.com/in/mariasantos' },
];

function status(value: string): 'empty' | 'ok' | 'not-https' | 'malformed' {
  const v = value.trim();
  if (!v) return 'empty';
  try {
    return new URL(v).protocol === 'https:' ? 'ok' : 'not-https';
  } catch {
    return 'malformed';
  }
}

const MESSAGE: Record<string, string> = {
  'not-https': 'Needs to be https://. An http:// link will be refused when you save.',
  malformed: 'Not a full link yet. Include https:// at the start.',
};

export function LinksPreview({ initial }: { initial: LinkState }) {
  const [links, setLinks] = useState<LinkState>(initial);
  const anyValid = Object.values(links).some((v) => status(v) === 'ok');

  return (
    <fieldset className="space-y-4">
      <legend className="text-base font-semibold">Portfolio website and linked accounts</legend>

      {LABELS.map(({ key, label, hint }) => {
        const state = status(links[key]);
        return (
          <div key={key} className="space-y-1.5">
            <label htmlFor={`link-${key}`} className="block text-sm font-semibold">
              {label}
            </label>
            <input
              id={`link-${key}`}
              // The name the server action already expects — this replaces the plain fields
              // rather than sitting beside them.
              name={`${key === 'website' ? 'website' : key}Url`}
              type="url"
              inputMode="url"
              value={links[key]}
              onChange={(e) => setLinks((l) => ({ ...l, [key]: e.target.value }))}
              placeholder={hint}
              aria-invalid={state === 'not-https' || state === 'malformed'}
              aria-describedby={`link-${key}-status`}
              className={cn(
                controlStyles,
                'h-11 px-3.5',
                state === 'not-https' || state === 'malformed'
                  ? 'border-danger'
                  : 'border-control hover:border-text-subtle',
              )}
            />
            <p
              id={`link-${key}-status`}
              className={`text-sm ${state === 'ok' ? 'text-text-muted' : 'text-danger'}`}
            >
              {MESSAGE[state] ?? ' '}
            </p>
          </div>
        );
      })}

      <div className="rounded-lg bg-surface-sunken p-4">
        <p className="text-sm font-semibold text-text-muted">On your public profile</p>
        {anyValid ? (
          <p className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {/* Rendered by the same component the real page uses, so what is shown here is
                exactly what visitors get — external-link icon, new tab, rel and all. */}
            <ExternalLink href={links.website.trim()} className="font-semibold">
              Portfolio
            </ExternalLink>
            <ExternalLink href={links.github.trim()} className="font-semibold">
              GitHub
            </ExternalLink>
            <ExternalLink href={links.linkedin.trim()} className="font-semibold">
              LinkedIn
            </ExternalLink>
          </p>
        ) : (
          <p className="mt-2 text-sm text-text-muted text-pretty">
            Nothing yet. Links are optional (a profile publishes without them), but they are the
            quickest way to give a client something to look at.
          </p>
        )}
      </div>
    </fieldset>
  );
}
