import Link from 'next/link';

import { boardStats } from '@techselect/backend/services/board-stats';

/**
 * Live numbers under the home headline, each linking to the list it counts. Only real counts
 * (backend/src/services/board-stats.ts); a figure that is zero is left out, and with nothing to show the
 * strip renders nothing at all rather than advertising an empty board.
 */
export async function BoardStats() {
  const { openBriefs, developers, newThisWeek } = await boardStats();
  const stats = [
    {
      n: openBriefs,
      label: openBriefs === 1 ? 'open brief' : 'open briefs',
      href: '/browse?type=jobs',
    },
    {
      n: developers,
      label: developers === 1 ? 'developer listed' : 'developers listed',
      href: '/browse?type=developers',
    },
    { n: newThisWeek, label: 'new this week', href: '/browse?type=jobs' },
  ].filter((s) => s.n > 0);

  if (!stats.length) return null;

  return (
    <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-4 border-t border-border-base pt-6">
      {stats.map((s) => (
        <div key={s.label} className="flex flex-col-reverse">
          <dt className="text-sm text-text-muted">
            <Link href={s.href} className="hover:text-text hover:underline">
              {s.label}
            </Link>
          </dt>
          <dd className="text-2xl font-semibold tracking-tight tabular-nums">
            {s.n.toLocaleString('en')}
          </dd>
        </div>
      ))}
    </dl>
  );
}
