import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google';
import type { ReactNode } from 'react';

import { Providers } from '@/components/providers';
import './globals.css';

/*
 * Three faces, all through next/font: self-hosted, subset, with size-adjusted fallbacks.
 *
 *   Geist          — every piece of UI and body text.
 *   Instrument Serif — display only: one title moment per screen (DESIGN.md §3.1). One weight,
 *                    one style — a single small file.
 *   Geist Mono     — tech stacks and code-shaped metadata, sparingly.
 */
/*
 * `display: 'optional'`, not 'swap' — measured, not assumed (DESIGN.md §6.2, J8). Under
 * Lighthouse's slow-4G profile the fonts arrived ~3.5s in, and with `swap` the already-painted
 * text re-rendered when they landed; Chrome records that re-render as a NEW, later Largest
 * Contentful Paint. LCP was the logo, at 3.9s, on a page whose first paint was 0.9s.
 *
 * `optional` gives a font ~100ms: if it is there (a warm cache, any decent connection, and every
 * page after the first) it is used from the first frame; if not, the metric-matched fallback is
 * used for that page view and nothing swaps. A slow first visit sees a close-enough fallback; it
 * never sees text jump.
 *
 * Geist Mono is not preloaded: it sets tech-stack labels below the fold, and a preload would
 * compete with the two faces the first screen actually uses.
 */
const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'], display: 'optional' });
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
  preload: false,
});
const serif = Instrument_Serif({
  variable: '--font-instrument-serif',
  weight: '400',
  // Normal only. The italic file existed for one emphasised word, which already carries the
  // accent colour; dropping it takes a font off the critical path (§6.2).
  style: 'normal',
  subsets: ['latin'],
  display: 'optional',
});

export const metadata: Metadata = {
  title: {
    default: 'Hiring for developers, by what they can do',
    template: '%s · TechSelect',
  },
  description:
    'A job board for software, web and automation work. Anyone can list — show a portfolio if you have one, and let clients decide. Semantic matching in both directions.',
  robots: { index: true, follow: true },
};

/*
 * Mobile baseline (mobile-native skill):
 *   - viewport-fit=cover so the page can paint under the notch, with `env(safe-area-inset-*)`
 *     padding the chrome back out — without it every env() value is 0;
 *   - interactive-widget=resizes-content so Android's keyboard shrinks the layout the way iOS
 *     does, keeping the message composer above it;
 *   - zoom is NOT disabled. Inputs are 16px instead, which is what stops iOS zooming on focus.
 *   - one theme-color per scheme, matched to the header surface, not the brand colour.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  themeColor: [
    // Exact sRGB of --surface in each theme (converted from the OKLCH tokens), so the status
    // bar and the header are one continuous colour.
    { media: '(prefers-color-scheme: light)', color: '#f6f3ef' },
    { media: '(prefers-color-scheme: dark)', color: '#120f0d' },
  ],
  colorScheme: 'light dark',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: next-themes sets data-theme on <html> before React hydrates.
    // It applies to this element only — it does not hide mismatches anywhere else.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${serif.variable} h-full`}
    >
      <body className="flex min-h-full flex-col font-sans">
        {/* First tab stop on every page — a §9 requirement, not an extra. */}
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
