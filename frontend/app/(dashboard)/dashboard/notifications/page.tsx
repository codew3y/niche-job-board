import {
  Bell,
  Briefcase,
  ChatCenteredText as MessageSquare,
  Sparkle,
} from '@phosphor-icons/react/ssr';
import type { Metadata } from 'next';
import Link from 'next/link';

import { MarkNotificationsSeen } from '@/components/notifications/mark-seen';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import {
  describeNotification,
  type NotificationType,
} from '@techselect/backend/notifications/describe';
import { listNotifications } from '@techselect/backend/services/notifications';
import { requireViewer } from '@techselect/backend/supabase/session';
import { cn } from '@/lib/ui/cn';

export const metadata: Metadata = { title: 'Notifications' };

const ICON: Record<NotificationType, React.ReactNode> = {
  application_received: <Briefcase aria-hidden="true" size={18} />,
  application_status_changed: <Briefcase aria-hidden="true" size={18} />,
  message_received: <MessageSquare aria-hidden="true" size={18} />,
  strong_match: <Sparkle aria-hidden="true" size={18} />,
};

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

/**
 * Notifications (gap analysis: in-app notifications). New applications on your jobs, changes to
 * applications you made, and new messages, newest first. Opening this page marks them read.
 */
export default async function NotificationsPage() {
  await requireViewer();
  const items = await listNotifications();
  const unread = items.filter((n) => !n.read_at).length;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Notifications"
        subtitle={
          unread > 0
            ? `${unread} new since you last looked.`
            : 'Applications, replies and changes, as they happen.'
        }
      />
      <MarkNotificationsSeen hasUnread={unread > 0} />

      {items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Nothing yet"
          body="New applications, changes to your applications and new messages will show up here."
        />
      ) : (
        <ul className="divide-y divide-border-base overflow-hidden rounded-lg border border-border-base bg-surface-raised">
          {items.map((n) => {
            const { text, href } = describeNotification(n);
            const isNew = !n.read_at;
            return (
              <li key={n.id}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-start gap-3 p-4 transition-colors duration-fast ease-out hover:bg-surface-sunken',
                    isNew && 'bg-primary-subtle/40',
                  )}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-md bg-surface-sunken text-text-muted">
                    {ICON[n.type]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'block text-pretty',
                        isNew ? 'font-semibold text-text' : 'text-text-muted',
                      )}
                    >
                      {text}
                    </span>
                    <span className="mt-0.5 block text-sm text-text-subtle tabular-nums">
                      {when(n.created_at)}
                    </span>
                  </span>
                  {isNew && <Badge tone="accent">New</Badge>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
