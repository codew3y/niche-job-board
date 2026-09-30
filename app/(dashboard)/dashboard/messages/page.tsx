import { MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

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
 */
export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const conversations = await listConversations(user.id);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Messages"
        subtitle="Conversations you are part of. Nobody is obliged to answer."
      />

      {conversations.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No messages"
          body="Clients can message you from your profile, and you can reply here. Nothing arrives until someone starts a conversation."
          action={
            <Link
              href="/browse?type=jobs"
              className={buttonStyles({ variant: 'secondary', size: 'sm' })}
            >
              Browse jobs
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-border-base overflow-hidden rounded-lg border border-border-base bg-surface-raised">
          {conversations.map((c) => {
            const name = c.counterparty?.name ?? 'Deleted account';
            const unread = c.unread > 0;
            return (
              <li key={c.id}>
                <Link
                  href={`/dashboard/messages/${c.id}`}
                  className="flex items-start gap-3.5 px-5 py-4 transition-colors duration-fast ease-out hover:bg-surface-sunken/60"
                >
                  <Avatar name={name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className={cn('truncate', unread ? 'font-semibold' : 'font-semibold')}>
                        {/* A deleted counterparty is named as one rather than blanked — the thread
                            is still the viewer's record of what was said. */}
                        {name}
                      </span>
                      <time
                        dateTime={c.lastMessageAt}
                        className="shrink-0 text-xs text-text-subtle tabular-nums"
                      >
                        {new Date(c.lastMessageAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </time>
                    </div>
                    {c.jobTitle && (
                      <p className="truncate text-xs text-text-subtle">{c.jobTitle}</p>
                    )}
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <p
                        className={cn('truncate text-sm', unread ? 'text-text' : 'text-text-muted')}
                      >
                        {c.preview}
                      </p>
                      {unread && (
                        <span className="shrink-0 rounded-full bg-accent px-2 text-2xs leading-5 font-semibold text-accent-text tabular-nums">
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
      )}
    </div>
  );
}
