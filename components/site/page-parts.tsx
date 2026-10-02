import Image, { type StaticImageData } from 'next/image';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

import { buttonStyles } from '@/components/ui/button';
import { cn } from '@/lib/ui/cn';

/**
 * Building blocks for the public content pages (For Freelancers, For Clients, How It Works,
 * About). Each block is a different LAYOUT FAMILY, so a page assembled from them never shows the
 * same composition twice (taste-skill 4.7, section-layout repetition ban):
 *
 *   PageIntro     the first-screen hero: copy left, a framed photograph right (HeroFigure)
 *   NumberedSteps a short row of steps, each under a hairline with a mono numeral
 *   FeatureBento  an asymmetric grid with tinted cells (6 items -> 6 cells)
 *   FeatureList   a side heading with a hairline-divided list beside it
 *   FeatureRows   definition rows under the heading: title column, body column
 *   PageCta       the closing statement: a hairline, a large line and the action, no box
 *
 * Every multi-column block states its < 768px fallback in its own classes: one column below
 * `md`, the multi-column grid from `md` or `lg` up.
 */

/** The page container: one max width (1200px, `max-w-page`) and the safe-area-aware gutter,
 *  shared by every section. */
export const CONTAINER = 'mx-auto w-full max-w-page gutter';

/** Every top-level section's vertical rhythm: 64 / 96 / 128px (`--spacing-section`). */
export const SECTION = 'py-section';

/**
 * The first-screen hero, shared by the home page and every page intro, so a header link always
 * opens on the same composition: copy across 7 columns beside a portrait photo across 5 from
 * `lg`, stacked below it.
 *
 * It fills the first screen (viewport minus the floating header: 0.75rem above it, 3.75rem of
 * bar, plus any notch inset), so the next section starts below the fold on every page. svh, not
 * dvh: the height must not jump as a phone's browser bar shows and hides. Top padding stays
 * under taste-skill's 6rem cap; the copy centres against the photo instead of floating.
 */
export const HERO_SECTION =
  'grid min-h-[calc(100svh-4.5rem-env(safe-area-inset-top,0px))] content-center gap-10 py-10 sm:py-14 lg:grid-cols-12 lg:items-center lg:gap-12 lg:py-12';

/**
 * The hero photograph in its nested frame (globals.css `frame-tray`): 4:3 on phones and tablets,
 * so it never pushes the copy off the first screen, and a 4:5 portrait from `lg`, capped so it
 * always fits beside the copy on a small laptop. The LCP element on every page that has one, so
 * it is preloaded and carries a blurred preview from its static import.
 */
export function HeroFigure({
  src,
  alt,
  className,
  position = 'center',
}: {
  src: StaticImageData;
  alt: string;
  className?: string;
  /** `object-position` for the crop, when the subject is not centred. */
  position?: 'center' | 'top' | 'bottom';
}) {
  return (
    // No entrance animation: this is the Largest Contentful Paint element, and fading it in from
    // opacity 0 held it unpainted for seconds on a throttled phone (Lighthouse render delay).
    // The copy beside it still rises in.
    <figure className={cn('frame-tray lg:col-span-5', className)}>
      <div className="rounded-inner relative aspect-4/3 overflow-hidden bg-surface-sunken lg:mx-auto lg:aspect-4/5 lg:max-h-[min(40rem,calc(100svh-9rem))]">
        <Image
          src={src}
          alt={alt}
          fill
          preload
          // `preload` adds the hint but leaves the request at Low priority, behind the scripts;
          // the LCP image has to jump the queue (Lighthouse, mobile, October 2026).
          fetchPriority="high"
          placeholder="blur"
          sizes="(min-width: 1024px) 34rem, 100vw"
          className={cn(
            'object-cover',
            position === 'top' && 'object-top',
            position === 'bottom' && 'object-bottom',
          )}
        />
      </div>
    </figure>
  );
}

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
      <div className="animate-rise lg:col-span-7 lg:pr-8">
        {eyebrow && <p className="font-mono text-xs text-text-subtle">{eyebrow}</p>}
        <h1 className={cn('max-w-[22ch] text-display-md', eyebrow && 'mt-5')}>{title}</h1>
        <p className="mt-6 max-w-[46ch] text-lg text-text-muted">{lead}</p>
        {children && <div className="mt-10 flex flex-wrap items-center gap-3">{children}</div>}
      </div>
      <HeroFigure src={image.src} alt={image.alt} />
    </section>
  );
}

/** The stagger index for a list item's scroll entrance (globals.css `reveal`). */
const stagger = (i: number) => ({ '--i': i }) as CSSProperties;

/**
 * A short sequence: three or four steps side by side under one hairline each, a mono numeral,
 * the title and one line of body. One column on phones, then as many columns as steps from `md`.
 */
export function NumberedSteps({
  heading,
  steps,
}: {
  heading: string;
  steps: readonly (readonly [string, string])[];
}) {
  return (
    <section className={cn(CONTAINER, SECTION)}>
      <h2 className="reveal max-w-[24ch] text-display-sm">{heading}</h2>
      <ol
        className={cn(
          'mt-12 grid gap-x-8 gap-y-10 lg:mt-16',
          steps.length === 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3',
        )}
      >
        {steps.map(([title, body], i) => (
          <li key={title} style={stagger(i)} className="reveal border-t border-border-strong pt-6">
            <span aria-hidden="true" className="font-mono text-sm text-text-subtle tabular-nums">
              {i + 1}
            </span>
            <h3 className="mt-6 text-xl font-semibold tracking-tight">{title}</h3>
            <p className="mt-3 max-w-[48ch] text-text-muted">{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/*
 * Bento spans on a 6-column grid from `lg`: wide/narrow, narrow/wide, then halves. Exactly as
 * many cells as items. Cells 1 and 4 are tinted (the palette's neutral and accent tints) so the
 * grid is not white-on-white (taste-skill bento background diversity).
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
 * An asymmetric feature grid of flat cells: hairline or tint, no shadow (minimalist-ui). One
 * column below `md`, two columns from `md`, the 6-column bento from `lg`. Built for six items;
 * with any other count the spans simply repeat in order.
 */
export function FeatureBento({
  heading,
  items,
}: {
  heading: string;
  items: readonly { title: string; body: string }[];
}) {
  return (
    <section className={cn(CONTAINER, SECTION)}>
      <h2 className="reveal max-w-[24ch] text-display-sm">{heading}</h2>
      <ul className="mt-12 grid gap-4 md:grid-cols-2 lg:mt-16 lg:grid-cols-6">
        {items.map((item, i) => (
          <li
            key={item.title}
            style={stagger(i % 3)}
            className={cn(
              'reveal flex min-h-44 flex-col justify-end rounded-lg border p-6 sm:p-8',
              BENTO_SPANS[i % BENTO_SPANS.length],
              BENTO_TINTS[i % BENTO_TINTS.length],
            )}
          >
            <h3 className="text-xl font-semibold tracking-tight">{item.title}</h3>
            <p className="mt-3 max-w-[56ch] text-text-muted">{item.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * A side heading with the items stacked beside it, divided by hairlines and not boxed. The right
 * column carries the content, so this is not the banned split header. Stacked below `lg`.
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
    <section className={cn(CONTAINER, SECTION)}>
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="reveal lg:col-span-4">
          <h2 className="text-display-sm">{heading}</h2>
          {lead && <p className="mt-4 max-w-[40ch] text-text-muted">{lead}</p>}
        </div>
        <ul className="divide-y divide-border-base border-t border-border-base lg:col-span-8">
          {items.map((item, i) => (
            <li key={item.title} style={stagger(i)} className="reveal py-7">
              <h3 className="text-xl font-semibold tracking-tight">{item.title}</h3>
              <p className="mt-2 max-w-[60ch] text-text-muted">{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * Definition rows under the heading: a title column and a body column, one hairline above the
 * group and between rows. Stacked (title over body) below `md`.
 */
export function FeatureRows({
  heading,
  items,
}: {
  heading: string;
  items: readonly { title: string; body: string }[];
}) {
  return (
    <section className={cn(CONTAINER, SECTION)}>
      <h2 className="reveal max-w-[24ch] text-display-sm">{heading}</h2>
      <dl className="mt-12 divide-y divide-border-base border-t border-border-strong lg:mt-16">
        {items.map((item, i) => (
          <div
            key={item.title}
            style={stagger(i)}
            className="reveal grid gap-2 py-7 md:grid-cols-12 md:gap-8"
          >
            <dt className="text-xl font-semibold tracking-tight md:col-span-4">{item.title}</dt>
            <dd className="max-w-[65ch] text-text-muted md:col-span-8">{item.body}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * The closing call to action: a hairline, a large statement and the action, with no panel around
 * it. The primary action is a button; the alternative is a text link, so there is one button.
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
    // No box: a hairline above, a large statement and the action beside it (minimalist-ui: no
    // container that does not do a job). Stacked below `md`.
    <section className={cn(CONTAINER, SECTION)}>
      <div className="reveal grid gap-8 border-t border-border-base pt-12 md:grid-cols-12 md:items-end md:gap-12 md:pt-16">
        <h2 className="max-w-[20ch] text-display-sm md:col-span-8">{title}</h2>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 md:col-span-4 md:justify-end">
          <Link href={primary.href} className={buttonStyles({ size: 'lg' })}>
            {primary.label}
          </Link>
          {secondary && (
            <Link href={secondary.href} className="prose-link font-medium">
              {secondary.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
