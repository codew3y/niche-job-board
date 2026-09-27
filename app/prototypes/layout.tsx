import type { Metadata } from 'next';
import { Instrument_Serif } from 'next/font/google';
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

// Only the Editorial direction uses a serif, and only here — it is not loaded by any
// production route, so it costs the real pages nothing.
const serif = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

export default function PrototypesLayout({ children }: { children: ReactNode }) {
  return <div className={`${serif.variable} contents`}>{children}</div>;
}
