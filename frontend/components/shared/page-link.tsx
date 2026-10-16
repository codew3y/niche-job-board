'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentProps, MouseEvent } from 'react';

/**
 * A link to a page that scrolls back to the top when you are already on that page.
 *
 * Next.js treats a link to the current page as a navigation that changes nothing, so clicking
 * the logo or "Home" while reading the home page used to leave you where you were. Here a click
 * on the current page scrolls to the top instead, smoothly unless reduced motion is asked for;
 * any other click is an ordinary Link. Modified clicks (new tab, new window) are left alone.
 *
 * `href` is a path string here, which is all the logo and the site navigation use.
 */
export function PageLink({
  href,
  onClick,
  ...props
}: Omit<ComponentProps<typeof Link>, 'href'> & { href: string }) {
  const pathname = usePathname();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    if (href.split(/[?#]/)[0] !== pathname) return;
    event.preventDefault();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  };

  return <Link href={href} onClick={handleClick} {...props} />;
}
