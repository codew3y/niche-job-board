'use client';

import { CheckCircle2, Info } from 'lucide-react';
import { useActionState } from 'react';

import { TagList } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FormError, TextareaField } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { StepCard, Submit } from './talent-forms';
import {
  addPortfolioItem,
  deletePortfolioItem,
  saveTalentEvidence,
} from '@/lib/actions/onboarding';
import type { ActionResult } from '@/lib/actions/auth';
import { cn } from '@/lib/ui/cn';
import { LinkListInput } from '@/components/portfolio/link-list-input';

type Item = { id: string; title: string; description: string; tech_stack: string[] };
type Profile = Record<string, unknown> | null;
const str = (p: Profile, k: string) => (p?.[k] as string | null) ?? '';

/**
 * The evidence step: the heart of ADR-004.
 *
 * Two routes to the same place: link an external site, or add projects here. Both are shown at
 * once rather than making the user choose a path up front, because many developers have a site
 * AND want a couple of items, and a fork would force a wrong answer early.
 *
 * The thin-profile nudge (§8, story S5) is framed as a benefit, never a wall: a URL the system
 * cannot read produces a weaker match, and saying so is more honest and more persuasive than
 * blocking publish.
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
    <div className="space-y-10">
      <div
        className={cn(
          'flex gap-3 rounded-lg border p-4 text-sm text-text',
          enough ? 'border-success/30 bg-success-subtle' : 'border-info/30 bg-info-subtle',
        )}
      >
        {enough ? (
          <CheckCircle2 aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-success" />
        ) : (
          <Info aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-info" />
        )}
        {enough ? (
          <p>
            <strong className="font-semibold">You have what you need to publish.</strong>{' '}
            {hasSite && items.length === 0
              ? 'Adding two or three projects here would still improve your matches. We can read these, but we never fetch your site.'
              : 'Add more projects any time.'}
          </p>
        ) : (
          <p>
            Link your portfolio site <strong className="font-semibold">or</strong> add two projects
            below. Either gives a client something to judge.{' '}
            {items.length === 1 && 'One more project will do it.'}
          </p>
        )}
      </div>

      <form action={linkAction} className="space-y-6" noValidate>
        <StepCard>
          <h2 className="text-lg font-semibold tracking-tight">Your links</h2>
          <Field
            label="Portfolio site"
            name="websiteUrl"
            type="url"
            inputMode="url"
            placeholder="https://yoursite.dev"
            defaultValue={str(profile, 'website_url')}
            errors={linkFields?.websiteUrl}
          />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              label="GitHub"
              name="githubUrl"
              type="url"
              inputMode="url"
              placeholder="https://github.com/you"
              defaultValue={str(profile, 'github_url')}
              errors={linkFields?.githubUrl}
            />
            <Field
              label="LinkedIn"
              name="linkedinUrl"
              type="url"
              inputMode="url"
              placeholder="https://linkedin.com/in/you"
              defaultValue={str(profile, 'linkedin_url')}
              errors={linkFields?.linkedinUrl}
            />
          </div>
        </StepCard>
        <Submit label="Save links and continue" />
      </form>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Projects</h2>
          <p className="mt-1 text-sm text-text-muted text-pretty">
            Matching reads these most closely. What you did, and what changed because of it, matters
            more than the stack list.
          </p>
        </div>

        {items.length > 0 && (
          <ul className="divide-y divide-border-base overflow-hidden rounded-lg border border-border-base bg-surface-raised shadow-xs">
            {items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-4 p-4 sm:p-5">
                <div className="min-w-0">
                  <p className="font-semibold text-text">{item.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-text-muted">{item.description}</p>
                  <TagList
                    className="mt-2.5"
                    label={`Tech stack for ${item.title}`}
                    tags={item.tech_stack.map((name) => ({ name }))}
                  />
                </div>
                <form action={deletePortfolioItem} className="shrink-0">
                  <input type="hidden" name="id" value={item.id} />
                  <Button type="submit" variant="danger-ghost" size="sm" className="h-10">
                    Remove
                    <span className="sr-only"> {item.title}</span>
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form
          action={itemAction}
          className="space-y-5 rounded-lg border border-dashed border-border-strong bg-surface-raised/50 p-5 sm:p-7"
          noValidate
        >
          <h3 className="font-semibold text-text">Add a project</h3>
          <Field
            label="Project title"
            name="title"
            placeholder="Subscription checkout rebuild"
            required
            errors={itemFields?.title}
          />
          <TextareaField
            label="What was it, and what did you do?"
            name="description"
            rows={3}
            errors={itemFields?.description}
            placeholder="Replaced a hand-rolled checkout with Stripe Checkout and webhook reconciliation."
          />
          <Field
            label="Outcome"
            name="outcome"
            optional
            placeholder="Failed payments fell from 4.1% to 0.6%"
            hint="A number if you have one. This is the most persuasive field on the page."
          />
          <Field
            label="Tech stack"
            name="techStack"
            optional
            placeholder="Next.js, Stripe, Postgres"
            hint="Comma separated."
          />
          <LinkListInput />
          {itemState?.ok === false && !itemState.fields && (
            <FormError>{itemState.message}</FormError>
          )}
          <SubmitButton variant="secondary" className="w-full sm:w-auto" pendingLabel="Adding…">
            Add project
          </SubmitButton>
        </form>
      </section>
    </div>
  );
}
