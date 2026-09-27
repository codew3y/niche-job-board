import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/ui/cn';

/**
 * The ONLY way a user-supplied URL may be rendered (§5.4, §9, docs/components.md).
 *
 * Centralised so no call site can forget:
 *   - `rel="noopener noreferrer nofollow"` — noopener stops the target reaching back through
 *     `window.opener`; nofollow stops us lending our ranking to anything anyone pastes.
 *   - an announced "opens in a new tab", because a link that silently changes context is
 *     disorienting for screen-reader users.
 *   - a final https guard. The Zod schema and the database CHECK both enforce this already;
 *     this is the third layer, and it is the one standing between a bad row and a rendered
 *     `javascript:` link.
 */
export function ExternalLink({
  href,
  children,
  className = '',
}: {
  href: string | null | undefined;
  children: ReactNode;
  className?: string;
}) {
  if (!href || !/^https:\/\//i.test(href)) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={cn('prose-link', className)}
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
      <ArrowUpRight
        aria-hidden="true"
        className="ml-0.5 inline-block size-3.5 align-[-0.1em] opacity-60"
      />
    </a>
  );
}
