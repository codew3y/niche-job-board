import { ArrowLeft, CheckCheck } from 'lucide-react';
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
   * it — 403 would confirm the id exists, which is itself a leak on a private conversation.
   */
  if (!thread) notFound();

  const name = thread.counterparty?.name ?? 'Deleted account';

  return (
    <div className="mx-auto flex max-w-2xl flex-col">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <Link
          href="/dashboard/messages"
          className="inline-flex items-center gap-1 text-text-muted hover:text-text"
        >
          <ArrowLeft aria-hidden="true" size={15} /> All messages
        </Link>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border-base pb-5">
        <div className="flex min-w-0 items-center gap-3.5">
          <Avatar name={name} size="lg" />
          <div className="min-w-0">
            <h1 className="font-semibold text-2xl leading-tight text-balance">
              {thread.counterparty?.href ? (
                <Link href={thread.counterparty.href} className="hover:underline">
                  {name}
                </Link>
              ) : (
                name
              )}
            </h1>
            {thread.job && (
              <p className="mt-0.5 text-sm text-text-muted">
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
        <p className="mt-4 rounded-lg bg-surface-sunken px-4 py-3 text-sm text-text-muted text-pretty">
          You blocked {name}. Nothing moves in either direction while that stands — and they have
          not been told. Unblock to reopen the conversation.
        </p>
      )}

      <MessageList messages={thread.messages} />

      {/*
        Marking read is a POST, not a side effect of rendering. A GET that mutates gets fired by
        link prefetch and by the browser's own back/forward cache, which would clear the unread
        badge for a page the person never actually looked at.
      */}
      <form action={markRead} className="mb-3">
        <input type="hidden" name="conversationId" value={thread.id} />
        <MarkReadButton unread={thread.messages.some((m) => !m.mine && !m.readAt)} />
      </form>

      <MessageComposer conversationId={thread.id} />
    </div>
  );
}

function MarkReadButton({ unread }: { unread: boolean }) {
  if (!unread) return null;
  return (
    <SubmitButton variant="ghost" size="sm" pendingLabel="Marking…">
      <CheckCheck aria-hidden="true" />
      Mark as read
    </SubmitButton>
  );
}
