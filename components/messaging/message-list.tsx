import type { ThreadMessage } from '@/lib/services/messaging';
import { cn } from '@/lib/ui/cn';

/**
 * A thread, oldest first.
 *
 * Bodies are rendered as text, never as markup. `messages.body` is plain text by schema
 * (lib/schemas/messaging.ts) and React escapes it — there is no dangerouslySetInnerHTML here
 * and there must never be one. Whitespace is preserved with CSS so paragraph breaks survive
 * without any parsing step that could reintroduce markup.
 *
 * Mine on the right in ink, theirs on the left on paper — the convention every messaging app
 * has taught, so nobody has to read a name to know who said what.
 */
export function MessageList({ messages }: { messages: ThreadMessage[] }) {
  if (messages.length === 0) {
    return <p className="py-16 text-center text-sm text-text-muted">No messages yet.</p>;
  }

  return (
    <ol aria-label="Messages" className="space-y-3 py-6">
      {messages.map((m) => (
        <li key={m.id} className={cn('flex', m.mine ? 'justify-end' : 'justify-start')}>
          <div
            className={cn(
              'max-w-[min(34rem,85%)] rounded-2xl px-4 py-3',
              m.redacted
                ? 'border border-dashed border-border-strong text-text-subtle italic'
                : m.mine
                  ? 'rounded-br-md bg-surface-inverse text-text-inverse'
                  : 'rounded-bl-md border border-border-base bg-surface-raised',
            )}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-pretty">{m.body}</p>
            <p
              className={cn(
                'mt-1.5 text-2xs tabular-nums',
                m.mine && !m.redacted ? 'text-text-inverse/65' : 'text-text-subtle',
              )}
            >
              <time dateTime={m.createdAt}>
                {new Date(m.createdAt).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </time>
              {/*
                Read state is shown to the SENDER only. Showing the recipient "you read this
                at 02:14" is surveillance, not information — they were there.
              */}
              {m.mine && !m.redacted && m.readAt && <span> · Read</span>}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
