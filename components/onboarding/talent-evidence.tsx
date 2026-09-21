'use client';

import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Submit } from './talent-forms';
import {
  addPortfolioItem,
  deletePortfolioItem,
  saveTalentEvidence,
} from '@/lib/actions/onboarding';
import type { ActionResult } from '@/lib/actions/auth';

type Item = { id: string; title: string; description: string; tech_stack: string[] };
type Profile = Record<string, unknown> | null;
const str = (p: Profile, k: string) => (p?.[k] as string | null) ?? '';

/**
 * The evidence step — the heart of ADR-004.
 *
 * Two routes to the same gate: link an external site, or add two projects here. The UI shows
 * both at once rather than making the user choose a path up front, because many developers
 * have a site AND want a couple of items, and a fork would force a wrong answer early.
 *
 * The thin-profile nudge (§8, story S5) is framed as a benefit, never a wall: a URL the
 * system cannot read produces a weaker match, and saying so is more honest and more
 * persuasive than blocking publish.
 */
export function TalentEvidenceStep({ profile, items }: { profile: Profile; items: Item[] }) {
  const [linkState, linkAction] = useActionState<ActionResult | null, FormData>(
    saveTalentEvidence,
    null,
  );
  const [itemState, itemAction] = useActionState<ActionResult | null, FormData>(
    addPortfolioItem,
    null,
  );
  const linkFields = linkState?.ok === false ? linkState.fields : undefined;
  const itemFields = itemState?.ok === false ? itemState.fields : undefined;

  const hasSite = Boolean(str(profile, 'website_url'));
  const enough = hasSite || items.length >= 2;

  return (
    <div className="space-y-8">
      <div
        className={`rounded-[--radius] border p-4 text-sm
          ${enough ? 'border-success/40 bg-success/5' : 'border-border-base bg-surface-sunken'}`}
      >
        {enough ? (
          <p>
            <strong>You have what you need to publish.</strong>{' '}
            {hasSite && items.length === 0
              ? 'Adding two or three projects here would still improve your matches — we can read these, but we never fetch your site.'
              : 'Add more projects any time.'}
          </p>
        ) : (
          <p>
            To publish you need <strong>either</strong> a link to your portfolio site{' '}
            <strong>or</strong> two projects below.{' '}
            {items.length === 1 && 'One more project will do it.'}
          </p>
        )}
      </div>

      <form action={linkAction} className="space-y-4" noValidate>
        <h2 className="font-medium">Your links</h2>
        <Field
          label="Portfolio site"
          name="websiteUrl"
          type="url"
          placeholder="https://yoursite.dev"
          defaultValue={str(profile, 'website_url')}
          errors={linkFields?.websiteUrl}
        />
        <Field
          label="GitHub"
          name="githubUrl"
          type="url"
          placeholder="https://github.com/you"
          defaultValue={str(profile, 'github_url')}
          errors={linkFields?.githubUrl}
        />
        <Field
          label="LinkedIn"
          name="linkedinUrl"
          type="url"
          placeholder="https://linkedin.com/in/you"
          defaultValue={str(profile, 'linkedin_url')}
          errors={linkFields?.linkedinUrl}
        />
        <Submit label="Save links and continue" />
      </form>

      <section className="space-y-4">
        <div>
          <h2 className="font-medium">Projects</h2>
          <p className="mt-1 text-sm text-text-muted text-pretty">
            These are what matching reads most closely — what you did and what changed because of it
            matters more than the stack list.
          </p>
        </div>

        {items.length > 0 && (
          <ul className="divide-y divide-border-base rounded-[--radius] border border-border-base">
            {items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-text-muted">{item.description}</p>
                  {item.tech_stack.length > 0 && (
                    <p className="mt-1 font-mono text-xs text-text-subtle">
                      {item.tech_stack.join(' · ')}
                    </p>
                  )}
                </div>
                <form action={deletePortfolioItem}>
                  <input type="hidden" name="id" value={item.id} />
                  <Button type="submit" variant="ghost" size="sm" className="text-danger">
                    Remove
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form
          action={itemAction}
          className="space-y-4 rounded-[--radius] border border-dashed border-border-strong p-4"
          noValidate
        >
          <Field
            label="Project title"
            name="title"
            placeholder="Subscription checkout rebuild"
            required
            errors={itemFields?.title}
          />
          <div className="space-y-1.5">
            <label htmlFor="description" className="block text-sm font-medium">
              What was it, and what did you do?
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              aria-invalid={Boolean(itemFields?.description)}
              className={`w-full rounded-[--radius] border bg-surface-raised p-3 placeholder:text-text-subtle
                ${itemFields?.description ? 'border-danger' : 'border-border-strong'}`}
              placeholder="Replaced a hand-rolled checkout with Stripe Checkout and webhook reconciliation."
            />
            {itemFields?.description && (
              <p className="text-sm text-danger">{itemFields.description[0]}</p>
            )}
          </div>
          <Field
            label="Outcome"
            name="outcome"
            placeholder="Failed payments fell from 4.1% to 0.6%"
            hint="A number if you have one. This is the most persuasive field on the page."
          />
          <Field
            label="Tech stack"
            name="techStack"
            placeholder="Next.js, Stripe, Postgres"
            hint="Comma separated."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Repo" name="repoUrl" type="url" placeholder="https://github.com/…" />
            <Field label="Live URL" name="liveUrl" type="url" placeholder="https://…" />
          </div>
          {itemState?.ok === false && !itemState.fields && (
            <p role="alert" className="text-sm text-danger">
              {itemState.message}
            </p>
          )}
          <Button type="submit" variant="secondary">
            Add project
          </Button>
        </form>
      </section>
    </div>
  );
}
