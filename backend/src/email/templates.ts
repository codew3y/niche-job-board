import { siteUrl } from '../env';
import type { EmailMessage } from './send';

/**
 * The three transactional emails, as data rather than components.
 *
 * Plain strings, not React Email. These are small, they are rendered on a server action's
 * critical path, and HTML email is not HTML — it is a 1998 table dialect where flexbox, grid,
 * <style> blocks and half of CSS are unsupported or stripped. A component library hides that
 * without removing it. Inline styles in a table layout are what actually renders everywhere.
 *
 * Every template returns text AND html. The text part is not a fallback nobody reads: a
 * message with no text/plain alternative scores worse with spam filters, and these are
 * exactly the messages that must not land in spam.
 */

/** Escape before interpolating. Every value below is user-supplied. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Shared shell. A 600px table, inline styles, no external CSS and no images: an email that
 * depends on remote images shows nothing until the reader clicks "load images", which most
 * clients block by default.
 */
function layout({
  heading,
  body,
  cta,
}: {
  heading: string;
  body: string;
  cta?: { label: string; href: string };
}) {
  const button = cta
    ? `<tr><td style="padding:24px 0 8px;">
         <a href="${esc(cta.href)}" style="display:inline-block;background:#1f6feb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:500;">${esc(cta.label)}</a>
       </td></tr>`
    : '';

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:24px 12px;background:#f6f6f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a18;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:10px;border:1px solid #e5e5e0;">
<tr><td style="padding:28px 28px 0;">
  <p style="margin:0 0 20px;font-weight:600;letter-spacing:-0.01em;">TechSelect</p>
  <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;font-weight:600;letter-spacing:-0.02em;">${esc(heading)}</h1>
</td></tr>
<tr><td style="padding:0 28px;font-size:15px;line-height:1.6;color:#3d3d38;">${body}</td></tr>
<tr><td style="padding:0 28px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0">${button}</table></td></tr>
<tr><td style="padding:24px 28px 28px;border-top:1px solid #efefea;margin-top:24px;">
  <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#8a8a80;">
    You are getting this because of something you did on TechSelect. We send no marketing email.
    <br><a href="${esc(siteUrl())}/privacy" style="color:#8a8a80;">Privacy</a> ·
    <a href="${esc(siteUrl())}/terms" style="color:#8a8a80;">Terms</a>
  </p>
</td></tr>
</table></body></html>`;
}

const p = (text: string) => `<p style="margin:0 0 12px;">${text}</p>`;

export function welcomeEmail(input: { to: string; displayName: string }): EmailMessage {
  const url = `${siteUrl()}/select-role`;
  return {
    to: input.to,
    template: 'welcome',
    subject: 'Welcome to TechSelect',
    text: `Hi ${input.displayName},

Your TechSelect account is ready.

Next, pick whether you are here to find work or to hire. You can do both — adding the second role later takes a minute.

If you are a developer: you can publish whenever you like — there is no bar to clear. A fuller bio and a piece of work you are proud of will place you better, because that is what the matching reads and what a client judges. But that is your call, not ours.

${url}

— TechSelect`,
    html: layout({
      heading: `Welcome, ${esc(input.displayName)}`,
      body:
        p('Your account is ready.') +
        p(
          'Next, pick whether you are here to find work or to hire. You can do both &mdash; adding the second role later takes a minute.',
        ) +
        p(
          '<strong>If you are a developer:</strong> you can publish whenever you like &mdash; there is no bar to clear. A fuller bio and a piece of work you are proud of will place you better, because that is what the matching reads and what a client judges. But that is your call, not ours.',
        ),
      cta: { label: 'Choose your role', href: url },
    }),
  };
}

export function newApplicationEmail(input: {
  to: string;
  jobTitle: string;
  jobId: string;
  applicantHeadline: string;
}): EmailMessage {
  const url = `${siteUrl()}/dashboard/client/jobs/${input.jobId}`;
  return {
    to: input.to,
    template: 'new_application',
    subject: `New application: ${input.jobTitle}`,
    text: `Someone applied to ${input.jobTitle}.

${input.applicantHeadline}

Their portfolio and cover note are on the job's candidate list:
${url}

— TechSelect`,
    html: layout({
      heading: 'You have a new application',
      body:
        p(`Someone applied to <strong>${esc(input.jobTitle)}</strong>.`) +
        p(esc(input.applicantHeadline)) +
        p('Their portfolio and cover note are on the candidate list.'),
      cta: { label: 'Review the application', href: url },
    }),
  };
}

/**
 * "You have a new message" (gap analysis #1).
 *
 * The message itself is NOT in the email: the sender's name and the job it is about are enough to
 * decide to open it, and keeping the text on TechSelect means a private conversation is not copied
 * into an inbox, a mail provider's logs and every device that syncs that inbox. One email per
 * unread stretch (backend/src/email/recipients.ts, messageRecipient), never one per message.
 */
export function newMessageEmail(input: {
  to: string;
  senderName: string;
  jobTitle: string | null;
  conversationId: string;
}): EmailMessage {
  const url = `${siteUrl()}/dashboard/messages/${input.conversationId}`;
  const about = input.jobTitle ? ` about ${input.jobTitle}` : '';
  return {
    to: input.to,
    template: 'new_message',
    subject: `New message from ${input.senderName}${about}`,
    text: `${input.senderName} sent you a message${about} on TechSelect.

Read and reply:
${url}

You will not get another email about this conversation until you have read it.

TechSelect`,
    html: layout({
      heading: 'You have a new message',
      body:
        p(
          `<strong>${esc(input.senderName)}</strong> sent you a message${
            input.jobTitle ? ` about <strong>${esc(input.jobTitle)}</strong>` : ''
          }.`,
        ) + p('You will not get another email about this conversation until you have read it.'),
      cta: { label: 'Read and reply', href: url },
    }),
  };
}

/**
 * Status changes the applicant is told about.
 *
 * `viewed` is absent on purpose. Emailing "a client opened your application" is a
 * notification about nothing that the applicant can act on, and it trains people to ignore
 * mail from this product. Withdrawn is absent too: the applicant did that themselves.
 */
const STATUS_COPY: Record<
  string,
  { subject: (job: string) => string; heading: string; body: string }
> = {
  shortlisted: {
    subject: (job) => `Shortlisted: ${job}`,
    heading: 'You have been shortlisted',
    body: 'The client moved your application to their shortlist. They may message you next — replies come to your inbox here.',
  },
  rejected: {
    subject: (job) => `Not moving forward: ${job}`,
    heading: 'This one is a no',
    body: 'The client is not taking your application further. Nothing about your profile changes, and it does not affect anything else you have applied to.',
  },
  hired: {
    subject: (job) => `You got it: ${job}`,
    heading: 'You have been hired',
    body: 'The client marked you as hired. Terms, contracts and payment are between the two of you — TechSelect is not part of that arrangement.',
  },
};

export function statusChangeEmail(input: {
  to: string;
  jobTitle: string;
  status: string;
}): EmailMessage | null {
  const copy = STATUS_COPY[input.status];
  // No template means this transition is deliberately not worth an email.
  if (!copy) return null;

  const url = `${siteUrl()}/dashboard/talent/applications`;
  return {
    to: input.to,
    template: `status_${input.status}`,
    subject: copy.subject(input.jobTitle),
    text: `${copy.heading}

${input.jobTitle}

${copy.body}

${url}

— TechSelect`,
    html: layout({
      heading: copy.heading,
      body: p(`<strong>${esc(input.jobTitle)}</strong>`) + p(copy.body),
      cta: { label: 'View your applications', href: url },
    }),
  };
}

/** The statuses that produce mail. Exported so the tests assert the list, not the behaviour. */
export const EMAILED_STATUSES = Object.keys(STATUS_COPY);
