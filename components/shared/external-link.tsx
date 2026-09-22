import type { ReactNode } from 'react';

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
      className={`underline-offset-2 hover:underline ${className}`}
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
      <svg
        aria-hidden="true"
        viewBox="0 0 12 12"
        className="ml-1 inline-block h-3 w-3 align-baseline opacity-60"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M4 2h6v6M10 2 4.5 7.5M8 8.5V10H2V4h1.5" strokeLinecap="round" />
      </svg>
    </a>
  );
}
