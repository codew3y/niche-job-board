import type { ThreadMessage } from '@/lib/services/messaging';

/**
 * A thread, oldest first.
 *
 * Bodies are rendered as text, never as markup. `messages.body` is plain text by schema
 * (lib/schemas/messaging.ts) and React escapes it — there is no dangerouslySetInnerHTML here
 * and there must never be one. Whitespace is preserved with CSS so paragraph breaks survive
 * without any parsing step that could reintroduce markup.
 */
export function MessageList({ messages }: { messages: ThreadMessage[] }) {
  if (messages.length === 0) {
    return <p className="py-10 text-center text-sm text-text-muted">No messages yet.</p>;
  }

  return (
    <ol className="space-y-3 py-2">
      {messages.map((m) => (
        <li key={m.id} className={m.mine ? 'flex justify-end' : 'flex justify-start'}>
          <div
            className={`max-w-[min(34rem,85%)] rounded-[--radius] px-4 py-2.5 ${
              m.redacted
                ? 'border border-dashed border-border-strong text-text-subtle italic'
                : m.mine
                  ? 'bg-accent text-accent-text'
                  : 'border border-border-base bg-surface-raised'
            }`}
          >
            <p className="whitespace-pre-wrap text-sm text-pretty">{m.body}</p>
            <p
              className={`mt-1 text-xs tabular-nums ${
                m.mine && !m.redacted ? 'text-accent-text/70' : 'text-text-subtle'
              }`}
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
