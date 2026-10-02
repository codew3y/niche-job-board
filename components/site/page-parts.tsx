import Image, { type StaticImageData } from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { buttonStyles } from '@/components/ui/button';
import { cn } from '@/lib/ui/cn';

/**
 * Building blocks for the public content pages (For Freelancers, For Clients, How It Works,
 * About). Each block is a different LAYOUT FAMILY, so a page assembled from them never shows the
 * same composition twice (taste-skill 4.7, section-layout repetition ban):
 *
 *   PageIntro     the first-screen hero: copy left, a real photograph right
 *   NumberedSteps a short vertical ordered list with numeral tiles
 *   FeatureBento  an asymmetric grid with tinted cells (6 items -> 6 cells)
 *   FeatureList   a side heading with a stacked list beside it
 *   FeatureRows   definition rows: title column, body column
 *   PageCta       the closing panel, same theme as the page (no dark band)
 *
 * Every multi-column block states its < 768px fallback in its own classes: one column below
 * `md`, the multi-column grid from `md` or `lg` up.
 */

/** The page container: one max width and the safe-area-aware gutter, shared by every section. */
export const CONTAINER = 'mx-auto w-full max-w-7xl gutter';

/**
 * The first-screen hero, shared by the home page and every page intro, so a header link always
 * opens on the same composition: copy (1fr) beside a photo (1.15fr) from `lg`, stacked below.
 *
 * It fills the first screen (viewport minus the 4rem header, its 1px border and any notch
 * inset), so the next section starts below the fold on every page, not only the home page.
 * From `lg` the row stretches and the photo grows to fill that height, with the copy centred
 * beside it. svh, not dvh: the height must not jump as a phone's browser bar shows and hides.
 */
export const HERO_SECTION =
  'grid min-h-[calc(100svh-4rem-1px-env(safe-area-inset-top,0px))] content-center gap-10 py-10 sm:py-14 lg:grid-cols-[1fr_1.15fr] lg:content-stretch lg:items-stretch lg:gap-12 lg:py-12';

/** The hero photo frame: 16:9 below `lg`, then as tall as the first screen allows. */
export const HERO_FIGURE =
  'relative aspect-video overflow-hidden rounded-lg border border-border-base bg-surface-sunken shadow-lg animate-rise lg:aspect-auto lg:h-full lg:min-h-80';

/**
 * Page intro: h1, a lead of 20 words or fewer, optional actions, and a photograph, laid out as
 * the home hero (HERO_SECTION), so every page in the header lines up with the home page.
 */
export function PageIntro({
  eyebrow,
  title,
  lead,
  image,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead: string;
  /** A static import (`import photo from '@/public/…'`), so it gets a blurred preview. */
  image: { src: StaticImageData; alt: string };
  children?: ReactNode;
}) {
  return (
    <section className={cn(CONTAINER, HERO_SECTION)}>
      <div className="flex flex-col justify-center animate-rise">
        {eyebrow && <p className="text-sm font-semibold text-link">{eyebrow}</p>}
        <h1
          className={cn(
            'text-display-md text-balance sm:text-display-lg lg:text-display-md xl:text-display-lg',
            eyebrow && 'mt-4',
          )}
        >
          {title}
        </h1>
        <p className="mt-6 max-w-lg text-lg text-text-muted text-pretty">{lead}</p>
        {children && <div className="mt-9 flex flex-wrap items-center gap-3">{children}</div>}
      </div>
      <figure className={HERO_FIGURE} style={{ animationDelay: '80ms' }}>
        <Image
          src={image.src}
          alt={image.alt}
          fill
          preload
          placeholder="blur"
          sizes="(min-width: 1024px) 55vw, 100vw"
          className="object-cover"
        />
      </figure>
    </section>
  );
}

/** A short ordered list, each step a numeral tile beside its title and one line of body. */
export function NumberedSteps({
  heading,
  steps,
}: {
  heading: string;
  steps: readonly (readonly [string, string])[];
}) {
  return (
    <section className={cn(CONTAINER, 'py-12 sm:py-16')}>
      <h2 className="text-display-sm text-balance">{heading}</h2>
      <ol className="mt-8 grid max-w-3xl gap-6">
        {steps.map(([title, body], i) => (
          <li key={title} className="grid grid-cols-[2.5rem_1fr] items-start gap-4">
            <span
              aria-hidden="true"
              className="grid size-10 place-items-center rounded-md bg-primary-subtle font-display text-lg font-semibold text-primary tabular-nums"
            >
              {i + 1}
            </span>
            <div className="pt-1.5">
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-text-muted text-pretty">{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/*
 * Bento spans on a 6-column grid from `lg`: wide/narrow, narrow/wide, then halves. Exactly as
 * many cells as items. Cells 1 and 4 are tinted so the grid is not white-on-white.
 */
const BENTO_SPANS = [
  'lg:col-span-4',
  'lg:col-span-2',
  'lg:col-span-2',
  'lg:col-span-4',
  'lg:col-span-3',
  'lg:col-span-3',
];
const BENTO_TINTS = [
  'border-transparent bg-primary-subtle',
  'border-border-base bg-surface-raised',
  'border-border-base bg-surface-raised',
  'border-transparent bg-accent-subtle',
  'border-border-base bg-surface-raised',
  'border-border-base bg-surface-raised',
];

/**
 * An asymmetric feature grid. One column below `md`, two columns from `md`, the 6-column bento
 * from `lg`. Built for six items; with any other count the spans simply repeat in order.
 */
export function FeatureBento({
  heading,
  items,
}: {
  heading: string;
  items: readonly { title: string; body: string }[];
}) {
  return (
    <section className={cn(CONTAINER, 'py-12 sm:py-16')}>
      <h2 className="text-display-sm text-balance">{heading}</h2>
      <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        {items.map((item, i) => (
          <li
            key={item.title}
            className={cn(
              'flex flex-col rounded-lg border p-6',
              BENTO_SPANS[i % BENTO_SPANS.length],
              BENTO_TINTS[i % BENTO_TINTS.length],
            )}
          >
            <h3 className="text-lg font-semibold text-balance">{item.title}</h3>
            <p className="mt-2 max-w-[60ch] text-text-muted text-pretty">{item.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * A side heading with the items stacked beside it. The right column carries the content, so
 * this is not the banned split header. Stacked below `lg`.
 */
export function FeatureList({
  heading,
  lead,
  items,
}: {
  heading: string;
  lead?: string;
  items: readonly { title: string; body: string }[];
}) {
  return (
    <section className={cn(CONTAINER, 'py-12 sm:py-16')}>
      <div className="grid gap-8 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <div>
          <h2 className="text-display-sm text-balance">{heading}</h2>
          {lead && <p className="mt-4 max-w-[45ch] text-text-muted text-pretty">{lead}</p>}
        </div>
        <ul className="grid gap-4">
          {items.map((item) => (
            <li
              key={item.title}
              className="rounded-lg border border-border-base bg-surface-raised p-6 shadow-xs"
            >
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-text-muted text-pretty">{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * Definition rows: a title column and a body column, one hairline above the group. Stacked
 * (title over body) below `md`.
 */
export function FeatureRows({
  heading,
  items,
}: {
  heading: string;
  items: readonly { title: string; body: string }[];
}) {
  return (
    <section className={cn(CONTAINER, 'py-12 sm:py-16')}>
      <h2 className="text-display-sm text-balance">{heading}</h2>
      <dl className="mt-8 grid gap-8 border-t border-border-strong pt-8">
        {items.map((item) => (
          <div key={item.title} className="grid gap-2 md:grid-cols-[16rem_1fr] md:gap-10">
            <dt className="font-semibold text-text">{item.title}</dt>
            <dd className="max-w-[65ch] text-text-muted text-pretty">{item.body}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * The closing call to action: a raised panel in the page's own theme. The primary action is a
 * button; the alternative is a text link, so there is one button per view.
 */
export function PageCta({
  title,
  primary,
  secondary,
}: {
  title: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <section className={cn(CONTAINER, 'pt-8 pb-20 sm:pb-24')}>
      <div className="flex flex-col items-start gap-6 rounded-lg border border-border-base bg-surface-raised px-6 py-10 shadow-sm md:flex-row md:items-center md:justify-between md:px-10">
        <h2 className="max-w-xl text-2xl font-semibold text-balance">{title}</h2>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link href={primary.href} className={buttonStyles({ size: 'lg' })}>
            {primary.label}
          </Link>
          {secondary && (
            <Link href={secondary.href} className="prose-link font-semibold">
              {secondary.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
