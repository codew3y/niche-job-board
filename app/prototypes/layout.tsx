import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './prototype.css';

/**
 * The prototype surface (DESIGN.md §2).
 *
 * Kept after the choice was made, at the owner's request, so the rejected directions can be
 * reviewed later. Nothing in production imports from here — the dependency only runs the
 * other way, so deleting this folder removes the prototypes and nothing else.
 *
 * Not indexed: these are design explorations with sample content, and a search result that
 * lands on one would be showing a stranger a page that is not the product.
 */
export const metadata: Metadata = {
  title: 'Prototypes',
  robots: { index: false, follow: false },
};

export default function PrototypesLayout({ children }: { children: ReactNode }) {
  return <div className="contents">{children}</div>;
}
