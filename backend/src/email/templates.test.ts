/**
 * Template tests.
 *
 * The two failure modes that matter for HTML email are both invisible in a rendered preview:
 * an unescaped user value, and a missing text/plain part. Both are checked here.
 *
 * Escaping matters more in email than on a page. React escapes by default, so the app's HTML
 * is safe by construction — these templates are hand-built strings, where nothing escapes
 * anything unless someone remembered to. A job title is user-supplied and lands in a message
 * we send to someone else's inbox.
 */

import { describe, expect, it } from 'vitest';

import {
  EMAILED_STATUSES,
  newApplicationEmail,
  newMessageEmail,
  statusChangeEmail,
  welcomeEmail,
} from './templates';

const all = [
  welcomeEmail({ to: 'a@example.test', displayName: 'Ada' }),
  newApplicationEmail({
    to: 'b@example.test',
    jobTitle: 'Stripe integration',
    jobId: '00000000-0000-4000-8000-000000000000',
    applicantHeadline: 'Payments engineer',
  }),
  statusChangeEmail({ to: 'c@example.test', jobTitle: 'Stripe integration', status: 'hired' })!,
  newMessageEmail({
    to: 'd@example.test',
    senderName: 'Ledgerline',
    jobTitle: 'Stripe integration',
    conversationId: '00000000-0000-4000-8000-000000000001',
  }),
];

describe('every template', () => {
  it('ships a text part alongside the HTML', () => {
    for (const m of all) {
      expect(m.text.trim().length).toBeGreaterThan(40);
      expect(m.html).toContain('<!doctype html>');
    }
  });

  it('names itself, so a failure log says which email failed', () => {
    for (const m of all) expect(m.template).toMatch(/^[a-z_]+$/);
  });

  it('has a subject that is not empty and not absurdly long', () => {
    for (const m of all) {
      expect(m.subject.length).toBeGreaterThan(5);
      // Most clients truncate around 70; anything past 120 is certainly cut off.
      expect(m.subject.length).toBeLessThan(120);
    }
  });

  it('carries no remote images — blocked by default, so the mail would render empty', () => {
    for (const m of all) expect(m.html).not.toMatch(/<img/i);
  });
});

describe('escaping', () => {
  const nasty = '</p><script>alert(1)</script>&"';

  it('ESCAPES A USER-SUPPLIED JOB TITLE', () => {
    const m = newApplicationEmail({
      to: 'b@example.test',
      jobTitle: nasty,
      jobId: '00000000-0000-4000-8000-000000000000',
      applicantHeadline: 'x',
    });
    expect(m.html).not.toContain('<script>');
    expect(m.html).toContain('&lt;script&gt;');
  });

  it('escapes a user-supplied display name', () => {
    const m = welcomeEmail({ to: 'a@example.test', displayName: nasty });
    expect(m.html).not.toContain('<script>');
  });

  it('escapes a user-supplied applicant headline', () => {
    const m = newApplicationEmail({
      to: 'b@example.test',
      jobTitle: 'ok',
      jobId: '00000000-0000-4000-8000-000000000000',
      applicantHeadline: nasty,
    });
    expect(m.html).not.toContain('<script>');
  });
});

describe('status changes', () => {
  it('SENDS NOTHING FOR "viewed"', () => {
    // A client opening an application is not news the applicant can act on. Mailing it
    // teaches people to ignore mail from this product, which costs the mails that matter.
    expect(statusChangeEmail({ to: 'c@example.test', jobTitle: 'j', status: 'viewed' })).toBeNull();
  });

  it('sends nothing for "withdrawn" — the applicant did that themselves', () => {
    expect(
      statusChangeEmail({ to: 'c@example.test', jobTitle: 'j', status: 'withdrawn' }),
    ).toBeNull();
  });

  it('sends nothing for "applied" — that is the confirmation, not a change', () => {
    expect(
      statusChangeEmail({ to: 'c@example.test', jobTitle: 'j', status: 'applied' }),
    ).toBeNull();
  });

  it('mails exactly shortlisted, rejected and hired', () => {
    expect([...EMAILED_STATUSES].sort()).toEqual(['hired', 'rejected', 'shortlisted']);
  });

  it('names the job in the subject, since people apply to several', () => {
    for (const status of EMAILED_STATUSES) {
      const m = statusChangeEmail({ to: 'c@example.test', jobTitle: 'Stripe integration', status });
      expect(m?.subject).toContain('Stripe integration');
    }
  });

  it('tells a rejected applicant it changes nothing else', () => {
    const m = statusChangeEmail({ to: 'c@example.test', jobTitle: 'j', status: 'rejected' });
    expect(m!.text).toMatch(/does not affect/i);
  });

  it('tells a hired applicant that terms are not our business', () => {
    // The terms page says we are not a party to the arrangement; the email must not imply
    // otherwise at the exact moment money starts being discussed.
    const m = statusChangeEmail({ to: 'c@example.test', jobTitle: 'j', status: 'hired' });
    expect(m!.text).toMatch(/between the two of you/i);
  });
});

describe('links', () => {
  it('points every call to action at an absolute URL', () => {
    // A relative href in an email resolves against the mail client, where it means nothing.
    for (const m of all) {
      const hrefs = [...m.html.matchAll(/href="([^"]+)"/g)].map((x) => x[1]!);
      expect(hrefs.length).toBeGreaterThan(0);
      for (const href of hrefs) expect(href).toMatch(/^https?:\/\//);
    }
  });

  it('includes privacy and terms, which is what the consent screen promised', () => {
    for (const m of all) {
      expect(m.html).toContain('/privacy');
      expect(m.html).toContain('/terms');
    }
  });
});

describe('the new-message email', () => {
  const base = {
    to: 'd@example.test',
    senderName: 'Ledgerline',
    jobTitle: 'Stripe integration' as string | null,
    conversationId: '00000000-0000-4000-8000-000000000001',
  };

  it('says who wrote and about which job, and links to the conversation', () => {
    const m = newMessageEmail(base);
    expect(m.subject).toBe('New message from Ledgerline about Stripe integration');
    expect(m.text).toContain('/dashboard/messages/00000000-0000-4000-8000-000000000001');
    expect(m.html).toContain('/dashboard/messages/00000000-0000-4000-8000-000000000001');
  });

  it('reads naturally for a conversation not tied to a job', () => {
    expect(newMessageEmail({ ...base, jobTitle: null }).subject).toBe(
      'New message from Ledgerline',
    );
  });

  it('escapes the sender name, which is user-supplied', () => {
    const m = newMessageEmail({ ...base, senderName: '<img src=x onerror=alert(1)>' });
    expect(m.html).not.toContain('<img src=x');
    expect(m.html).toContain('&lt;img');
  });

  it('never carries the message itself, and says no more email comes until it is read', () => {
    const m = newMessageEmail(base);
    expect(Object.keys(base)).not.toContain('body');
    expect(m.text).toMatch(/not get another email about this conversation until you have read it/);
  });
});
