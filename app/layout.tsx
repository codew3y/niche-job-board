import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import type { ReactNode } from 'react';

import { Providers } from '@/components/providers';
import './globals.css';

/*
 * Two faces through next/font (self-hosted, subset, size-adjusted fallbacks):
 *   - Geist for headings, text and interface (400, 500, 600): one family, hierarchy from size,
 *     weight and tracking (the October 2026 redesign dropped Outfit);
 *   - Geist Mono for facts (rates, time zones, dates), not preloaded because no first screen
 *     depends on it.
 *
 * `display: 'optional'`, not 'swap', for the first-screen face: with `swap`, text painted
 * in the fallback re-rendered when the font landed and Chrome counted it as a new, later LCP
 * (DESIGN.md §6.2). `optional` keeps the metric-matched fallback for that view instead.
 */
const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'optional',
});
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  title: {
    // The brand alone on the home page; inner pages read "Browse · TechSelect" and so on.
    default: 'TechSelect',
    template: '%s · TechSelect',
  },
  description:
    'A job board for software, web and automation work. List yourself, show a portfolio if you have one, and let clients decide. Matching runs in both directions.',
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
    { media: '(prefers-color-scheme: light)', color: '#fafaf9' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0b0c' },
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
      className={`${geist.variable} ${geistMono.variable} h-full`}
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
