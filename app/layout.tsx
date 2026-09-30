import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';

import { Providers } from '@/components/providers';
import './globals.css';

/*
 * One face: Inter, through next/font (self-hosted, subset, with a size-adjusted fallback), in
 * exactly two weights — 400 for text, 600 for emphasis and headings. No display or mono faces.
 *
 * `display: 'optional'`, not 'swap' — measured on this site (DESIGN.md §6.2): with `swap`, text
 * that painted in the fallback re-rendered when the font landed and Chrome counted that as a
 * new, later LCP. `optional` uses the font if it arrives within ~100ms and otherwise keeps the
 * metric-matched fallback for that page view, so text never jumps.
 */
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '600'],
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
    // The page background in each theme (--surface), so the status bar and the page are one
    // continuous colour.
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  colorScheme: 'light dark',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: next-themes sets data-theme on <html> before React hydrates.
    // It applies to this element only — it does not hide mismatches anywhere else.
    <html lang="en" suppressHydrationWarning className={`${inter.variable} h-full`}>
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
