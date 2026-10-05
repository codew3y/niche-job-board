/**
 * How a notification reads, and where it leads. Pure, so the list page and its tests share it.
 *
 * Payloads are written by lib/notifications/notify.ts; anything missing falls back to wording
 * that is still true, so an old or partial payload never renders as "undefined".
 */
export type NotificationType =
  'application_received' | 'application_status_changed' | 'message_received' | 'strong_match';

export type NotificationRow = {
  id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

const s = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

const STATUS_TEXT: Record<string, string> = {
  shortlisted: 'shortlisted you',
  rejected: 'is not moving forward with your application',
  hired: 'hired you',
};

export function describeNotification(n: NotificationRow): { text: string; href: string } {
  const p = n.payload ?? {};
  const job = s(p.jobTitle);
  switch (n.type) {
    case 'application_received':
      return {
        text: `New application${job ? ` for ${job}` : ''}${s(p.applicantHeadline) ? ` from ${s(p.applicantHeadline)}` : ''}.`,
        href: s(p.jobId) ? `/dashboard/client/jobs/${s(p.jobId)}` : '/dashboard/client/jobs',
      };
    case 'application_status_changed': {
      const what = STATUS_TEXT[s(p.status) ?? ''] ?? 'updated your application';
      return {
        text: `${s(p.company) ?? 'A client'} ${what}${job ? ` for ${job}` : ''}.`,
        href: '/dashboard/talent/applications',
      };
    }
    case 'message_received':
      return {
        text: `${s(p.senderName) ?? 'Someone'} sent you a message${job ? ` about ${job}` : ''}.`,
        href: s(p.conversationId)
          ? `/dashboard/messages/${s(p.conversationId)}`
          : '/dashboard/messages',
      };
    case 'strong_match':
      return {
        text: `A strong match${job ? `: ${job}` : ''}.`,
        href: '/dashboard/talent/matches',
      };
  }
}
