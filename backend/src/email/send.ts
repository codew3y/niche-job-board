import 'server-only';

import { Resend } from 'resend';

import { serverEnv } from '../env';

/**
 * The one place email leaves this application.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE: sending email must never fail the thing that
 * triggered it. If Resend is down, or rate-limited, or the key is missing, applying to a job
 * still succeeds. The application is the user's work; the notification is our convenience.
 * Every send here is therefore fire-and-report, and no caller is given a way to await a
 * failure into their own error path.
 *
 * The opposite bug is just as bad and quieter: swallowing the failure entirely, so that
 * nobody ever sends mail and nothing anywhere says so. Failures are logged with the template
 * name and the Resend error, and the result is returned for tests to assert on.
 */

/**
 * Resend's shared sender. It requires no domain, and it CAN ONLY DELIVER TO THE EMAIL
 * ADDRESS ON THE RESEND ACCOUNT — every other recipient is refused with a 403.
 *
 * That is fine for building and testing, and it is a trap in production: mail to real users
 * silently goes nowhere from their point of view. `deliverability()` below states which mode
 * the app is in so this is visible rather than discovered.
 *
 * To lift it: verify a domain at resend.com/domains and set EMAIL_FROM to an address on it.
 *
 * Owner decision 2026-09-24: no domain for now, so this is the live configuration rather than
 * a temporary state on the way to something else. Notifications genuinely do not reach users.
 * `deliverability().ownerOnly` reports it and /api/health surfaces it, because the failure is
 * otherwise invisible — Resend accepts the call and refuses the recipient.
 */
const SHARED_SENDER = 'TechSelect <onboarding@resend.dev>';

export type EmailResult =
  | { sent: true; id: string }
  | { sent: false; reason: 'no_api_key' | 'provider_error'; detail?: string };

export type EmailMessage = {
  to: string;
  subject: string;
  /** Plain text alongside HTML, always. A text/plain part is what stops mail reading as spam. */
  text: string;
  html: string;
  /** Names the template in logs, so a failure says which mail failed rather than "an email". */
  template: string;
};

let client: Resend | null = null;

function resend(apiKey: string): Resend {
  client ??= new Resend(apiKey);
  return client;
}

export function emailFrom(): string {
  return serverEnv().EMAIL_FROM ?? SHARED_SENDER;
}

/**
 * Which mode email is in. Surfaced so a deploy can be checked without sending anything, and
 * so "why did the client never get their notification" has an answer that is not a guess.
 */
export function deliverability(): {
  configured: boolean;
  ownerOnly: boolean;
  from: string;
} {
  const { RESEND_API_KEY, EMAIL_FROM } = serverEnv();
  return {
    configured: Boolean(RESEND_API_KEY),
    // The shared sender only reaches the Resend account owner. A custom EMAIL_FROM implies a
    // verified domain, which reaches anyone.
    ownerOnly: !EMAIL_FROM,
    from: emailFrom(),
  };
}

export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const { RESEND_API_KEY } = serverEnv();

  if (!RESEND_API_KEY) {
    /**
     * Not an error. Local development and preview deploys run without a key by design, and
     * the product works without email. Logged at info so it is visible in a log trail without
     * looking like a fault.
     */
    console.info(`[email] skipped ${message.template} — no RESEND_API_KEY configured`);
    return { sent: false, reason: 'no_api_key' };
  }

  try {
    const { data, error } = await resend(RESEND_API_KEY).emails.send({
      from: emailFrom(),
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    if (error) {
      // Never log `message.to` at error level alongside content — the address is the personal
      // data here. The template name is enough to find the call site.
      console.error(`[email] ${message.template} failed: ${error.name}: ${error.message}`);
      return { sent: false, reason: 'provider_error', detail: error.message };
    }

    return { sent: true, id: data?.id ?? '' };
  } catch (cause) {
    // A network failure or a thrown SDK error. Caught here so it cannot escape into the
    // caller's transaction — see the rule at the top of this file.
    const detail = cause instanceof Error ? cause.message : String(cause);
    console.error(`[email] ${message.template} threw: ${detail}`);
    return { sent: false, reason: 'provider_error', detail };
  }
}

/**
 * Send without making the caller wait or handle the outcome.
 *
 * Server Actions run to completion before the response is returned, so an awaited send adds
 * its latency to the user's click. This deliberately does not await: the caller's work is
 * already done, and the notification can land a moment later.
 *
 * The rejection handler is not optional — an unhandled promise rejection in a Node server is
 * a process-level event, so "fire and forget" without it is how a mail failure takes down a
 * request that had nothing to do with email.
 */
export function sendEmailInBackground(message: EmailMessage): void {
  void sendEmail(message).catch((cause: unknown) => {
    console.error(`[email] ${message.template} escaped sendEmail: ${String(cause)}`);
  });
}
