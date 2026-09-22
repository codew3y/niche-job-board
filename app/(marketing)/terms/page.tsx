import type { Metadata } from 'next';
import Link from 'next/link';

import { LegalPage, Section } from '@/components/legal/legal-page';
import { siteUrl } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Terms',
  description:
    'The rules for using TechSelect: what you may post, what happens between clients and developers, and what this service does not promise.',
  alternates: { canonical: `${siteUrl()}/terms` },
};

/**
 * Deliberately short, and deliberately does not promise things the product does not do.
 *
 * The temptation with a terms page is to import boilerplate that claims a moderation process,
 * an SLA and a dispute procedure, none of which exist here. Claiming them would be the actual
 * liability. What is written below is what the software genuinely does.
 */
export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      intro="The rules for using this site, in plain language and no longer than they need to be."
      lastUpdated="2026-09-23"
    >
      <Section heading="What this is">
        <p>
          TechSelect is a place where developers publish what they have built and clients post work.
          That is the whole service. By using it you agree to what follows.
        </p>
      </Section>

      <Section heading="Your account">
        <p>
          You need an account to publish a profile, post a job, apply or send a message. Keep your
          sign-in details to yourself — anything done through your account is treated as done by
          you. One account per person; a second account created to get around a block or a removal
          will be removed.
        </p>
        <p>You must be old enough to enter a contract where you live.</p>
      </Section>

      <Section heading="What you post">
        <p>
          You keep ownership of everything you put here — your bio, your portfolio, your job posts,
          your messages. You give us only the permission needed to run the service: storing it, and
          displaying it to the people it is meant for. For a published profile or an open job, that
          includes showing it publicly and letting search engines index it.
        </p>
        <p>Do not post:</p>
        <ul className="list-disc space-y-1 pl-5 text-text-muted">
          <li>Work you did not do, or credentials you do not hold</li>
          <li>Anyone else&rsquo;s content without the right to use it</li>
          <li>Anything unlawful, hateful, or aimed at harassing a particular person</li>
          <li>Malware, spam, scams, or bulk identical messages to unrelated people</li>
          <li>Other people&rsquo;s personal information</li>
        </ul>
        <p className="text-text-muted">
          Portfolio claims are the currency of this site. Inflating them is the one thing most
          likely to get an account removed.
        </p>
      </Section>

      <Section heading="Messages">
        <p>
          Messaging exists so a client can start a conversation about work. It is not a channel for
          unrelated marketing. Developers can turn messages off entirely, and anyone can block
          anyone — a block is mutual and immediate.
        </p>
        <p>
          Nobody is obliged to reply to a message, an application, or anything else on this site.
        </p>
      </Section>

      <Section heading="Between clients and developers">
        <p>
          <strong>We are not a party to your arrangements.</strong> We do not employ developers, we
          do not vet clients, we take no fee and we handle no payments. Terms, rates, contracts,
          invoicing, tax and delivery are between the two of you.
        </p>
        <p>
          We do not verify that a profile is truthful, that a job post is real, or that either side
          will do what they said. Use the same judgement you would anywhere else: check the work,
          ask questions, and do not send money to strangers.
        </p>
      </Section>

      <Section heading="Moderation, honestly">
        <p>
          There is no review queue and no moderation team. Blocking and reporting are the controls
          that exist. Reports are read by a person, with no fixed turnaround and no automatic
          action, so if you want something to stop now, block them.
        </p>
        <p>
          We can remove content or accounts that break these terms, usually without warning where
          the content is clearly abusive.
        </p>
      </Section>

      <Section heading="Availability">
        <p>
          The service is provided as it is, with no promise that it will be available, correct or
          uninterrupted. It runs on free infrastructure tiers and may be slow, down, or changed
          without notice. Keep your own copy of anything you would be upset to lose.
        </p>
        <p>
          To the extent the law allows, we are not liable for losses arising from using the site —
          including work you did not win, a client who did not pay, or data that went missing.
        </p>
      </Section>

      <Section heading="Ending it">
        <p>
          You can delete your account at any time from settings. We can close an account that breaks
          these terms. What deletion actually removes, and the one thing it deliberately does not,
          is set out in the{' '}
          <Link href="/privacy" className="underline">
            privacy policy
          </Link>
          .
        </p>
      </Section>

      <Section heading="Changes">
        <p>
          These terms may change. The date at the top changes when they do, and continuing to use
          the site means the new version applies.
        </p>
      </Section>

      <p className="border-t border-border-base pt-6 text-sm text-text-subtle">
        See also the{' '}
        <Link href="/privacy" className="underline">
          privacy policy
        </Link>
        .
      </p>
    </LegalPage>
  );
}
