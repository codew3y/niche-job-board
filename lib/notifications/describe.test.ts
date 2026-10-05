import { describe, expect, it } from 'vitest';

import { describeNotification, type NotificationRow } from './describe';

const row = (type: NotificationRow['type'], payload: Record<string, unknown>): NotificationRow => ({
  id: '1',
  type,
  payload,
  read_at: null,
  created_at: '2026-10-05T10:00:00Z',
});

describe('describeNotification', () => {
  it('a new application names the job and the applicant, and links to the applicants', () => {
    expect(
      describeNotification(
        row('application_received', {
          jobId: 'j1',
          jobTitle: 'Stripe migration',
          applicantHeadline: 'Payments engineer',
        }),
      ),
    ).toEqual({
      text: 'New application for Stripe migration from Payments engineer.',
      href: '/dashboard/client/jobs/j1',
    });
  });

  it('a status change names the company and what happened', () => {
    expect(
      describeNotification(
        row('application_status_changed', {
          status: 'shortlisted',
          jobTitle: 'Stripe migration',
          company: 'Ledgerline',
        }),
      ).text,
    ).toBe('Ledgerline shortlisted you for Stripe migration.');
  });

  it('a message links to its conversation', () => {
    expect(
      describeNotification(
        row('message_received', { conversationId: 'c1', senderName: 'Ledgerline', jobTitle: null }),
      ),
    ).toEqual({
      text: 'Ledgerline sent you a message.',
      href: '/dashboard/messages/c1',
    });
  });

  it('never renders "undefined" from a partial or old payload', () => {
    for (const type of [
      'application_received',
      'application_status_changed',
      'message_received',
      'strong_match',
    ] as const) {
      const { text, href } = describeNotification(row(type, {}));
      expect(text).not.toMatch(/undefined|null/);
      expect(href.startsWith('/dashboard/')).toBe(true);
    }
  });
});
