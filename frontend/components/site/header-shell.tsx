'use client';

import { useEffect, useState, type ReactNode } from 'react';

import { cn } from '@/lib/ui/cn';

/**
 * The header's outer bar. Transparent over the top of the page, so the hero reads as one piece;
 * once the page scrolls, a translucent surface, a hairline and a blur come in, so the links stay
 * legible over whatever passes underneath. The only client code in the header: one passive
 * scroll listener that flips a boolean, no layout work.
 */
export function HeaderShell({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <header
      data-scrolled={scrolled || undefined}
      className={cn(
        'sticky top-0 z-sticky border-b pt-[env(safe-area-inset-top,0px)] transition-[background-color,border-color,backdrop-filter] duration-base ease-out',
        scrolled
          ? 'border-border-base bg-surface/80 backdrop-blur-md supports-[not(backdrop-filter:blur(0))]:bg-surface'
          : 'border-transparent bg-transparent',
      )}
    >
      {children}
    </header>
  );
}
