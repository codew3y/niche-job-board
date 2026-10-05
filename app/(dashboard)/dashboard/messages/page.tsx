import { ChatCenteredText as MessageSquare } from '@phosphor-icons/react/ssr';
import Link from 'next/link';

import { ThreadLive } from '@/components/messaging/thread-live';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { Skeleton } from '@/components/shared/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { buttonStyles } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/ui/cn';
import { PageHeader } from '@/components/ui/page-header';
import { listConversations } from '@/lib/services/messaging';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Messages' };

/**
 * The inbox, shared by both roles.
 *
 * One route rather than /dashboard/talent/messages and /dashboard/client/messages: a
 * conversation belongs to two people at once, and splitting it by role would mean someone who
 * has both roles has two inboxes containing the same threads. RLS already scopes the list to
 * the viewer's own threads regardless of which role they are currently wearing.
 *
 * LOADING — a `loading.tsx` here would also wrap the thread route, which has a notFound() and
 * must not stream before it (see client/saved/loading.tsx). So the list streams inside the page
 * instead: the heading renders at once, the conversations arrive behind a skeleton of the same
 * rows. The auth check stays above the boundary so a redirect is still a real redirect.
 */
export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Messages"
        subtitle="Conversations you are part of. Nobody is obliged to answer."
      />
      <Suspense fallback={<InboxSkeleton />}>
        <Inbox userId={user.id} />
      </Suspense>
      {/* New conversations and unread counts appear without a reload while this is open. */}
      <ThreadLive />
    </div>
  );
}

async function Inbox({ userId }: { userId: string }) {
  const conversations = await listConversations(userId);

  if (conversations.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No messages yet"
        body="Clients start conversations from a developer's profile. When someone writes to you, or replies to you, it shows up here."
        action={
          <Link href="/browse" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
            Go to Browse
          </Link>
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-border-base overflow-hidden rounded-lg border border-border-base bg-surface-raised">
      {conversations.map((c) => {
        const name = c.counterparty?.name ?? 'Deleted account';
        const unread = c.unread > 0;
        return (
          <li key={c.id}>
            <Link
              href={`/dashboard/messages/${c.id}`}
              className={cn(
                'flex items-start gap-3.5 px-4 py-4 transition-colors duration-fast ease-out hover:bg-surface-sunken/60 sm:px-5',
                unread && 'bg-primary-subtle/40',
              )}
            >
              <Avatar name={name} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span
                    className={cn(
                      'truncate',
                      unread ? 'font-semibold text-text' : 'font-medium text-text',
                    )}
                  >
                    {/* A deleted counterparty is named as one rather than blanked: the thread
                        is still the viewer's record of what was said. */}
                    {name}
                  </span>
                  <time
                    dateTime={c.lastMessageAt}
                    className={cn(
                      'shrink-0 text-xs tabular-nums',
                      unread ? 'font-semibold text-text' : 'text-text-subtle',
                    )}
                  >
                    {new Date(c.lastMessageAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </time>
                </div>
                {c.jobTitle && (
                  <p className="truncate text-xs text-text-subtle">About {c.jobTitle}</p>
                )}
                <div className="mt-1 flex items-center justify-between gap-3">
                  <p className={cn('truncate text-sm', unread ? 'text-text' : 'text-text-muted')}>
                    {c.preview}
                  </p>
                  {unread && (
                    <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-sm bg-accent px-1.5 text-xs font-semibold text-accent-text tabular-nums">
                      {c.unread}
                      <span className="sr-only"> unread messages</span>
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** The same rows as the inbox: avatar, name and date, a preview line. */
function InboxSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading messages"
      className="divide-y divide-border-base overflow-hidden rounded-lg border border-border-base bg-surface-raised"
    >
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex items-start gap-3.5 px-4 py-4 sm:px-5">
          <Skeleton className="size-10 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1 space-y-2 pt-0.5">
            <div className="flex justify-between gap-3">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-3.5 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
