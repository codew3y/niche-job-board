import { ArrowLeft, Prohibit as Ban, Checks as CheckCheck } from '@phosphor-icons/react/ssr';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { MessageComposer } from '@/components/messaging/message-composer';
import { MessageList } from '@/components/messaging/message-list';
import { ThreadActions } from '@/components/messaging/thread-actions';
import { Avatar } from '@/components/ui/avatar';
import { SubmitButton } from '@/components/ui/submit-button';
import { markRead } from '@/lib/actions/messaging';
import { getThread } from '@/lib/services/messaging';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Conversation' };

/**
 * One conversation.
 *
 * NO LOADING SKELETON, on purpose: `getThread` is also the existence check, and a streamed
 * skeleton would send a 200 before a missing thread could answer 404 (see
 * client/saved/loading.tsx for the full reasoning).
 *
 * Layout, top to bottom: back link, who and what it is about, the moderation controls, the
 * thread, then the composer, which is sticky so it stays reachable (and above the phone
 * keyboard) however long the thread gets.
 */
export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const thread = await getThread(id, user.id);
  /**
   * A thread the viewer is not part of returns null from RLS, and 404 is the right answer for
   * it: 403 would confirm the id exists, which is itself a leak on a private conversation.
   */
  if (!thread) notFound();

  const name = thread.counterparty?.name ?? 'Deleted account';
  const unread = thread.messages.some((m) => !m.mine && !m.readAt);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col">
      <nav aria-label="Breadcrumb" className="mb-3">
        <Link
          href="/dashboard/messages"
          className="-ml-1 inline-flex min-h-10 items-center gap-1.5 rounded-md px-1 text-sm text-text-muted hover:text-text"
        >
          <ArrowLeft aria-hidden="true" size={15} /> All messages
        </Link>
      </nav>

      <header className="flex flex-col gap-3 border-b border-border-base pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          <Avatar name={name} size="lg" className="hidden sm:grid" />
          <Avatar name={name} className="sm:hidden" />
          <div className="min-w-0">
            <h1 className="text-xl leading-tight font-semibold break-words sm:text-2xl">
              {thread.counterparty?.href ? (
                <Link href={thread.counterparty.href} className="hover:underline">
                  {name}
                </Link>
              ) : (
                name
              )}
            </h1>
            {thread.job && (
              <p className="mt-0.5 truncate text-sm text-text-muted">
                About{' '}
                <Link href={`/jobs/${thread.job.slug}`} className="prose-link">
                  {thread.job.title}
                </Link>
              </p>
            )}
          </div>
        </div>

        <ThreadActions
          conversationId={thread.id}
          counterpartyUserId={thread.counterparty?.userId ?? null}
          counterpartyName={name}
          blocked={thread.blocked}
        />
      </header>

      {thread.blocked && (
        <p
          role="status"
          className="mt-4 flex gap-2.5 rounded-md bg-surface-sunken px-4 py-3 text-sm text-text text-pretty"
        >
          <Ban aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-text-subtle" />
          <span>
            You blocked {name}. No messages go either way while the block stands, and they have not
            been told. Unblock to reopen the conversation.
          </span>
        </p>
      )}

      <MessageList messages={thread.messages} />

      {/*
        Marking read is a POST, not a side effect of rendering. A GET that mutates gets fired by
        link prefetch and by the browser's own back/forward cache, which would clear the unread
        badge for a page the person never actually looked at.
      */}
      {unread && (
        <form action={markRead} className="mb-3 flex justify-end">
          <input type="hidden" name="conversationId" value={thread.id} />
          <SubmitButton
            variant="ghost"
            size="sm"
            className="min-h-10 sm:min-h-0"
            pendingLabel="Marking…"
          >
            <CheckCheck aria-hidden="true" />
            Mark as read
          </SubmitButton>
        </form>
      )}

      <MessageComposer conversationId={thread.id} />
    </div>
  );
}
