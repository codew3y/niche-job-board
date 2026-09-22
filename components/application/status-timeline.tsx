import { STATUS_LABELS } from './status-badge';

type Event = { from_status: string | null; to_status: string; at: string };

/**
 * The history of one application, both sides can see.
 *
 * Rows come from `application_events`, written by a SECURITY DEFINER trigger — the caller
 * cannot write them, which is what makes this a record rather than a claim (migration 0001).
 *
 * Rendered as an ordered list because that is what it is: a sequence. Screen readers then
 * announce position and length for free.
 */
export function StatusTimeline({ events }: { events: Event[] }) {
  if (events.length === 0) return null;

  return (
    <ol className="mt-3 space-y-1.5 border-l border-border-base pl-4">
      {events.map((e, i) => (
        <li key={`${e.at}-${i}`} className="relative text-sm">
          <span
            aria-hidden="true"
            className={`absolute -left-[1.3125rem] top-1.5 h-2 w-2 rounded-full
              ${i === events.length - 1 ? 'bg-accent' : 'bg-border-strong'}`}
          />
          <span className={i === events.length - 1 ? 'font-medium' : 'text-text-muted'}>
            {e.from_status === null ? 'Applied' : `${STATUS_LABELS[e.to_status] ?? e.to_status}`}
          </span>
          <time dateTime={e.at} className="ml-2 text-text-subtle">
            {new Date(e.at).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </time>
        </li>
      ))}
    </ol>
  );
}
