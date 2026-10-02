import { ChatCenteredText as MessageSquare } from '@phosphor-icons/react/ssr';

import type { ThreadMessage } from '@/lib/services/messaging';
import { cn } from '@/lib/ui/cn';

/**
 * A thread, oldest first.
 *
 * Bodies are rendered as text, never as markup. `messages.body` is plain text by schema
 * (lib/schemas/messaging.ts) and React escapes it: there is no dangerouslySetInnerHTML here
 * and there must never be one. Whitespace is preserved with CSS so paragraph breaks survive
 * without any parsing step that could reintroduce markup.
 *
 * Mine on the right on a navy tint, theirs on the left on the raised surface with a hairline:
 * the convention every messaging app has taught, so nobody has to read a name to know who said
 * what. Both bubbles carry body text at 16px in the full text colour, so a long message reads as
 * comfortably as a paragraph, in either theme. (A solid navy "mine" bubble becomes a solid ice
 * cyan one in dark mode, which is loud for a column of paragraphs.)
 */
export function MessageList({ messages }: { messages: ThreadMessage[] }) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <span
          aria-hidden="true"
          className="mb-3 grid size-11 place-items-center rounded-md bg-surface-sunken text-text-subtle"
        >
          <MessageSquare size={20} />
        </span>
        <p className="font-semibold">No messages yet</p>
        <p className="mt-1 max-w-xs text-sm text-text-muted text-pretty">
          Write the first one below.
        </p>
      </div>
    );
  }

  return (
    <ol aria-label="Messages" className="space-y-3 py-6">
      {messages.map((m) => (
        <li key={m.id} className={cn('flex', m.mine ? 'justify-end' : 'justify-start')}>
          <div
            className={cn(
              'max-w-[min(36rem,88%)] rounded-lg px-4 py-3',
              m.redacted
                ? 'border border-dashed border-border-strong text-text-subtle italic'
                : m.mine
                  ? 'rounded-br-sm bg-primary-subtle text-text'
                  : 'rounded-bl-sm border border-border-base bg-surface-raised text-text',
            )}
          >
            <p className="leading-relaxed break-words whitespace-pre-wrap text-pretty">{m.body}</p>
            <p
              className={cn(
                'mt-1.5 text-xs tabular-nums',
                m.mine ? 'text-right text-text-muted' : 'text-text-subtle',
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
                at 02:14" is surveillance, not information: they were there.
              */}
              {m.mine && !m.redacted && m.readAt && <span> · Read</span>}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
