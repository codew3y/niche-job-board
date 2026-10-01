import { Sparkles } from 'lucide-react';

/**
 * A small card laid over the hero photo showing what the product does: one developer, the
 * one-sentence reason, the skills behind it. It is labelled as an example on its face, because
 * it is one; the person is not real. Skill names are real taxonomy rows.
 *
 * Decorative to the page's argument but real content to a reader, so it is NOT aria-hidden.
 */
export function ExampleMatchCard({ className }: { className?: string }) {
  return (
    <div
      className={
        'w-80 max-w-[calc(100%-2rem)] rounded-lg border border-border-base bg-surface-raised/95 p-4 shadow-lg backdrop-blur-sm ' +
        (className ?? '')
      }
    >
      <p className="inline-flex items-center gap-1.5 rounded-md bg-primary-subtle px-2 py-0.5 text-xs font-semibold text-primary">
        <Sparkles aria-hidden="true" size={13} />
        Example match
      </p>
      <div className="mt-3 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-subtle text-sm font-semibold text-link"
        >
          AC
        </span>
        <p className="text-sm font-semibold leading-snug">
          Payments engineer, Next.js and Postgres
        </p>
      </div>
      <p className="mt-3 text-sm text-text-muted text-pretty">
        &ldquo;Shipped this exact billing migration twice, including the invoice backfill.&rdquo;
      </p>
      <ul aria-label="Skills" className="mt-3 flex flex-wrap gap-1.5">
        {['Payment integration', 'PostgreSQL', 'Next.js'].map((s) => (
          <li
            key={s}
            className="rounded-md border border-border-base px-2 py-0.5 text-xs text-text-muted"
          >
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}
