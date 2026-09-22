import Link from 'next/link';
import { redirect } from 'next/navigation';

import { EmptyState } from '@/components/ui/empty-state';
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
    <>
      <PageHeader
        title="Messages"
        subtitle="Conversations you are part of. Replies are not expected — nobody is obliged to answer."
      />

      {conversations.length === 0 ? (
        <EmptyState
          title="No messages"
          body="Clients can message you from your profile, and you can reply here. Nothing arrives until someone starts a conversation."
          action={
            <Link href="/jobs" className="text-sm underline">
              Browse jobs
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-border-base rounded-[--radius] border border-border-base">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link
                href={`/dashboard/messages/${c.id}`}
                className="flex items-start gap-3 p-4 transition-colors duration-[--duration-fast] hover:bg-surface-sunken"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className={`truncate ${c.unread > 0 ? 'font-semibold' : 'font-medium'}`}>
                      {/* A deleted counterparty is named as one rather than blanked — the
                          thread is still the viewer's record of what was said. */}
                      {c.counterparty?.name ?? 'Deleted account'}
                    </span>
                    {c.jobTitle && (
                      <span className="truncate text-sm text-text-muted">· {c.jobTitle}</span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-text-muted">{c.preview}</p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1">
                  <time
                    dateTime={c.lastMessageAt}
                    className="text-xs tabular-nums text-text-subtle"
                  >
                    {new Date(c.lastMessageAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </time>
                  {c.unread > 0 && (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium tabular-nums text-accent-text">
                      {c.unread}
                      <span className="sr-only"> unread messages</span>
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
