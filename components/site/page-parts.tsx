import Image, { type StaticImageData } from 'next/image';
import Link from 'next/link';
import type { IconProps } from '@phosphor-icons/react';
import type { ComponentType, CSSProperties, ReactNode } from 'react';

import { buttonStyles } from '@/components/ui/button';
import { cn } from '@/lib/ui/cn';

/**
 * Building blocks for the public content pages (For Freelancers, For Clients, How It Works,
 * About). Each block is a different LAYOUT FAMILY, so a page assembled from them never shows the
 * same composition twice (taste-skill 4.7, section-layout repetition ban):
 *
 *   PageIntro     the first-screen hero: copy left, a framed photograph right (HeroFigure)
 *   NumberedSteps a short row of steps, with a photo each or under a hairline with a numeral
 *   FeatureCards  icon cards in a grid, optionally led by one statement card
 *   FeatureList   a side heading with a hairline-divided list beside it
 *   FeatureRows   definition rows under the heading: title column, body column
 *   PageCta       the closing statement: a band in the brand colour with the action
 *
 * Every multi-column block states its < 768px fallback in its own classes: one column below
 * `md`, the multi-column grid from `md` or `lg` up.
 */

/** The page container: one max width (1200px, `max-w-page`) and the safe-area-aware gutter,
 *  shared by every section. */
export const CONTAINER = 'mx-auto w-full max-w-page gutter';

/** Every top-level section's vertical rhythm: 56 / 72 / 88px (`--spacing-section`). */
export const SECTION = 'py-section';

/**
 * A full-width tinted band behind one section: the sunken well, a tint within the same theme
 * rather than an inverted block. Alternate sections sit on it, so a page reads as a sequence
 * instead of blocks floating on one background. Hairlines above and below keep the edge crisp.
 */
export function Band({ children }: { children: ReactNode }) {
  return <div className="border-y border-border-base bg-surface-sunken">{children}</div>;
}

/**
 * The first-screen hero, shared by the home page and every page intro, so a header link always
 * opens on the same composition: copy across 7 columns beside a portrait photo across 5 from
 * `lg`, stacked below it.
 *
 * It fills the first screen (viewport minus the 4rem header, plus any notch inset), so the next section starts below the fold on every page. svh, not
 * dvh: the height must not jump as a phone's browser bar shows and hides. Top padding stays
 * under taste-skill's 6rem cap; the copy centres against the photo instead of floating.
 */
export const HERO_SECTION =
  'grid min-h-[calc(100svh-4rem-env(safe-area-inset-top,0px))] grid-cols-1 content-center gap-10 py-10 sm:py-14 lg:grid-cols-12 lg:items-center lg:gap-12 lg:py-12';

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
  aside,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead: string;
  /** A static import (`import photo from '@/public/…'`), so it gets a blurred preview. */
  image?: { src: StaticImageData; alt: string };
  /** In place of the photo: a panel with the same footprint (board-showcase.tsx). */
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className={cn(CONTAINER, HERO_SECTION)}>
      {/* 7/5 beside a photo; an even 6/6 beside a panel, which needs the width for its cards. */}
      <div className={cn('animate-rise lg:pr-8', aside ? 'lg:col-span-6' : 'lg:col-span-7')}>
        {eyebrow && <p className="font-mono text-xs text-text-subtle">{eyebrow}</p>}
        <h1 className={cn('max-w-[22ch] text-display-md', eyebrow && 'mt-5')}>{title}</h1>
        <p className="mt-6 max-w-[46ch] text-lg text-text-muted">{lead}</p>
        {children && <div className="mt-10 flex flex-wrap items-center gap-3">{children}</div>}
      </div>
      {aside ?? (image && <HeroFigure src={image.src} alt={image.alt} />)}
    </section>
  );
}

/** The stagger index for a list item's scroll entrance (globals.css `reveal`). */
const stagger = (i: number) => ({ '--i': i }) as CSSProperties;

/**
 * A short sequence: three or four steps side by side. Each can carry a photograph of the step, in
 * the site's nested frame, with the step number set on it; without photos, each step sits under
 * a hairline with a mono numeral. One column on phones, then as many columns as steps from `md`.
 */
export function NumberedSteps({
  heading,
  steps,
  images,
}: {
  heading: string;
  steps: readonly (readonly [string, string])[];
  /** One photo per step, in order (static imports, so each gets a blurred preview). */
  images?: readonly { src: StaticImageData; alt: string }[];
}) {
  return (
    <section className={cn(CONTAINER, SECTION)}>
      <h2 className="reveal max-w-[24ch] text-display-sm">{heading}</h2>
      <ol
        className={cn(
          'mt-12 grid gap-x-8 gap-y-12 lg:mt-16',
          steps.length === 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3',
        )}
      >
        {steps.map(([title, body], i) => {
          const image = images?.[i];
          return (
            <li
              key={title}
              style={stagger(i)}
              className={cn('reveal', !image && 'border-t border-border-strong pt-6')}
            >
              {image ? (
                <figure className="frame-tray relative">
                  <div className="rounded-inner relative aspect-4/3 overflow-hidden bg-surface-sunken">
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      placeholder="blur"
                      sizes="(min-width: 768px) 24rem, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-4 left-5 grid size-9 place-items-center rounded-full border border-border-base bg-surface-raised font-mono text-sm font-semibold tabular-nums shadow-sm"
                  >
                    {i + 1}
                  </span>
                </figure>
              ) : (
                <span
                  aria-hidden="true"
                  className="font-mono text-sm text-text-subtle tabular-nums"
                >
                  {i + 1}
                </span>
              )}
              <h3 className={cn('text-xl font-semibold tracking-tight', image ? 'mt-8' : 'mt-6')}>
                {title}
              </h3>
              <p className="mt-3 max-w-[48ch] text-text-muted">{body}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** A feature: a title, a line of body and an icon (a Phosphor icon component). */
export type Feature = { title: string; body: string; icon: ComponentType<IconProps> };

/** The icon tile colours, cycled: the palette's two tints, so a grid is not one colour. */
const ICON_TINTS = ['bg-primary-subtle text-primary', 'bg-accent-subtle text-accent'];

/**
 * Feature cards: each with an icon tile, a mono index, the title and the body, in a raised card
 * that lifts under the pointer. One column on phones, two from `md`, three from `lg`.
 *
 * `featured` sets the first item apart as a statement card, two columns by two rows from `lg` (so
 * six items fill three full rows), on the primary colour, for a section with one idea that leads
 * the rest (About's "What we believe").
 */
export function FeatureCards({
  heading,
  lead,
  items,
  featured = false,
}: {
  heading: string;
  lead?: string;
  items: readonly Feature[];
  featured?: boolean;
}) {
  return (
    <section className={cn(CONTAINER, SECTION)}>
      <div className="reveal grid gap-4 md:grid-cols-12 md:items-end">
        <h2 className="max-w-[24ch] text-display-sm md:col-span-7">{heading}</h2>
        {lead && (
          <p className="max-w-[44ch] text-text-muted md:col-span-5 md:justify-self-end">{lead}</p>
        )}
      </div>
      <ul className="mt-12 grid gap-4 md:grid-cols-2 lg:mt-16 lg:grid-cols-3">
        {items.map(({ title, body, icon: Icon }, i) => {
          const lead = featured && i === 0;
          return (
            <li
              key={title}
              style={stagger(i % 3)}
              className={cn(
                'reveal liftable group relative flex flex-col overflow-hidden rounded-xl border p-6 sm:p-7',
                lead
                  ? 'border-transparent bg-primary text-primary-text md:col-span-2 lg:row-span-2 lg:justify-between'
                  : 'border-border-base bg-surface-raised hover:border-border-strong',
              )}
            >
              <div className="relative flex items-start justify-between gap-4">
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-11 place-items-center rounded-lg',
                    lead
                      ? 'bg-primary-text/15 text-primary-text'
                      : ICON_TINTS[i % ICON_TINTS.length],
                  )}
                >
                  <Icon size={22} weight="duotone" />
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'font-mono text-xs tabular-nums',
                    lead ? 'text-primary-text/70' : 'text-text-subtle',
                  )}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              {/* The statement card keeps its words at the foot, under a large open field. */}
              <div className={cn('relative', lead && 'lg:mt-auto')}>
                <h3
                  className={cn(
                    'mt-8 font-semibold tracking-tight text-balance',
                    lead ? 'text-2xl lg:text-4xl' : 'text-xl',
                  )}
                >
                  {title}
                </h3>
                <p
                  className={cn(
                    'mt-3 max-w-[56ch]',
                    lead ? 'text-lg text-primary-text/85' : 'text-text-muted',
                  )}
                >
                  {body}
                </p>
              </div>
            </li>
          );
        })}
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
 * The closing call to action, at the foot of every public page: a band in the brand colour with
 * a large statement and the action. The primary action is a button inverted onto the band; the
 * alternative is a text link, so there is one button. A solid colour, no gradient. Stacked
 * below `md`.
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
    <section className={cn(CONTAINER, SECTION)}>
      <div className="reveal grid gap-8 overflow-hidden rounded-2xl bg-primary px-6 py-10 text-primary-text sm:px-10 sm:py-14 md:grid-cols-12 md:items-end md:gap-12 lg:px-14 lg:py-16">
        <h2 className="max-w-[20ch] text-display-sm md:col-span-8">{title}</h2>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 md:col-span-4 md:justify-end">
          <Link href={primary.href} className={buttonStyles({ variant: 'inverse', size: 'lg' })}>
            {primary.label}
          </Link>
          {secondary && (
            <Link href={secondary.href} className="prose-link font-medium text-primary-text">
              {secondary.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
