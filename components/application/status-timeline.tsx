import { STATUS_LABELS } from './status-badge';

type Event = { from_status: string | null; to_status: string; at: string };

/**
 * The history of one application, both sides can see.
 *
 * Rows come from `application_events`, written by a SECURITY DEFINER trigger — the caller
 * cannot write them, which is what makes this a record rather than a claim (migration 0001).
 *
 * Rendered as an ordered list because that is what it is: a sequence. Screen readers then
 * announce position and length for free. The latest step carries the accent dot.
 */
export function StatusTimeline({ events }: { events: Event[] }) {
  if (events.length === 0) return null;

  return (
    <ol aria-label="Status history" className="mt-4 space-y-2 border-l border-border-strong pl-4">
      {events.map((e, i) => {
        const last = i === events.length - 1;
        return (
          <li
            key={`${e.at}-${i}`}
            className="relative flex flex-wrap items-baseline gap-x-2 text-sm"
          >
            <span
              aria-hidden="true"
              className={`absolute top-1.5 -left-[1.3125rem] size-2 rounded-full ring-4 ring-surface-raised ${
                last ? 'bg-accent' : 'bg-border-strong'
              }`}
            />
            <span className={last ? 'font-semibold' : 'text-text-muted'}>
              {e.from_status === null ? 'Applied' : `${STATUS_LABELS[e.to_status] ?? e.to_status}`}
            </span>
            <time dateTime={e.at} className="text-text-subtle tabular-nums">
              {new Date(e.at).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </time>
          </li>
        );
      })}
    </ol>
  );
}
