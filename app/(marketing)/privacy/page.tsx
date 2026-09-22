import type { Metadata } from 'next';
import Link from 'next/link';

import { LegalPage, Section } from '@/components/legal/legal-page';
import { siteUrl } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Privacy',
  description:
    'What TechSelect stores, who can see it, which third parties process it, and what happens when you delete your account.',
  alternates: { canonical: `${siteUrl()}/privacy` },
};

/**
 * Written from the schema and the RLS policies, not from a template.
 *
 * Every claim below corresponds to something enforced in the database — the visibility rules
 * are the policies in lib/db/schema/*, and the deletion behaviour is migrations 0002 and
 * 0008. That is the only way this page stays true: if it described intentions rather than
 * constraints, it would drift the first time someone changed a policy.
 *
 * Where a thing is NOT built yet, it says so rather than reserving the right to do it later.
 */
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      intro="What this site stores, who can see it, and what happens when you leave."
      lastUpdated="2026-09-23"
    >
      <Section heading="The short version">
        <p>
          A published developer profile is public, because being found is the point of having one.
          Everything else — drafts, saved lists, applications and messages — is visible only to the
          people directly involved, and that is enforced by the database rather than by the
          application remembering to check.
        </p>
      </Section>

      <Section heading="What is public">
        <p>Once you publish a developer profile, anyone can see:</p>
        <ul className="list-disc space-y-1 pl-5 text-text-muted">
          <li>Your headline, bio, skills, rates, availability, timezone and years of experience</li>
          <li>Your portfolio items, including any links and images you add to them</li>
          <li>Any website, GitHub or LinkedIn links you provide</li>
        </ul>
        <p>
          The same applies to a job post once it is open: its title, description, budget range,
          required skills and the company name behind it.
        </p>
        <p className="text-text-muted">
          Search engines index these pages. That is deliberate — a profile nobody can find does not
          do its job — but it means you should treat anything you put on a published profile as
          public, permanently, including after you unpublish it.
        </p>
      </Section>

      <Section heading="What is not public">
        <p>
          None of the following is visible to anyone but you and, where relevant, the other party:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-text-muted">
          <li>An unpublished profile or a draft job post — only you can load it</li>
          <li>Your email address. It is never shown on a profile or a job post</li>
          <li>
            Your saved jobs and saved developers. These are one-directional: a developer cannot see
            which clients saved them, and a client cannot see who saved their job
          </li>
          <li>
            Applications, cover notes and their status history — the applicant and the job owner
            only
          </li>
          <li>Messages — the two people in the conversation only</li>
        </ul>
      </Section>

      <Section heading="Messages">
        <p>
          Messages are plain text and are stored in full. Both participants can read the whole
          thread; nobody else can, including us in normal operation, though as the people who run
          the database we can technically read it and would if legally compelled or when
          investigating a report.
        </p>
        <p>
          <strong>Blocking is mutual and silent.</strong> If you block someone, neither of you can
          write to the other, and they are not told that it happened. We consider this a privacy
          feature: someone who learns they have been blocked tends to make a second account.
        </p>
        <p>
          <strong>Reports are one-way.</strong> The person you report cannot see that you reported
          them. A person reads reports; there is no automated action and no fixed turnaround, so
          blocking is the control that takes effect immediately.
        </p>
      </Section>

      <Section heading="Who else processes your data">
        <p>This is a small site and it stands on other people&rsquo;s infrastructure:</p>
        <ul className="list-disc space-y-1 pl-5 text-text-muted">
          <li>
            <strong>Supabase</strong> — the database, authentication and file storage. Everything
            described on this page physically lives there
          </li>
          <li>
            <strong>Vercel</strong> — hosting. Receives the usual request metadata, including your
            IP address, in order to serve pages
          </li>
          <li>
            <strong>Google and GitHub</strong> — only if you choose to sign in with them. They tell
            us your email address, name and avatar; we do not receive your password and we do not
            ask either service for anything beyond your basic profile
          </li>
          <li>
            <strong>Resend</strong> — sends transactional email. Receives your email address and the
            contents of that email
          </li>
        </ul>
        <p className="text-text-muted">
          There is no analytics, no advertising and no tracking on this site. The only cookies set
          are the ones that keep you signed in.
        </p>
      </Section>

      <Section heading="Email we send">
        <p>
          Only email tied to something you did: confirming your address, resetting a password, a new
          application on your job, and a change to an application you submitted. There is no
          marketing email, so there is no marketing list to unsubscribe from.
        </p>
      </Section>

      <Section heading="Deleting your account">
        <p>
          You can delete your account, and it genuinely deletes. Your profile, portfolio, uploads,
          job posts, applications, saved lists and blocks are removed.
        </p>
        <p>
          <strong>Conversations are the deliberate exception.</strong> A conversation has two
          owners. If it were destroyed when one person left, the other would lose their record of an
          exchange they may still need. So the thread survives with your side tombstoned: your name
          is detached from it, and the text of your messages is replaced with a note saying the
          account was deleted. The other participant keeps the shape of the conversation and their
          own words; they cannot recover yours.
        </p>
      </Section>

      <Section heading="Retention">
        <p>
          Data stays until you delete it or delete your account. We do not currently expire old
          jobs, applications or messages automatically.
        </p>
      </Section>

      <Section heading="Your rights">
        <p>
          You can see and edit everything on your profile from your dashboard, and delete your
          account from settings at any time. For anything else — a copy of your data, or a question
          about how it is handled — contact us and we will deal with it.
        </p>
      </Section>

      <Section heading="Honest limitations">
        <p className="text-text-muted">
          This is an independently built product, not a company with a compliance department. There
          is no human moderation queue: blocking and reporting are what exists. No system is
          perfectly secure, and we are not going to pretend otherwise. If you find a problem with
          how data is handled here, tell us and it will get fixed.
        </p>
      </Section>

      <Section heading="Changes">
        <p>
          If this policy changes in a way that affects what is visible to whom, the date at the top
          changes with it.
        </p>
      </Section>

      <p className="border-t border-border-base pt-6 text-sm text-text-subtle">
        See also the{' '}
        <Link href="/terms" className="underline">
          terms of service
        </Link>
        .
      </p>
    </LegalPage>
  );
}
