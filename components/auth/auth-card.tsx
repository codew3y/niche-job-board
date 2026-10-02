import Image from 'next/image';
import type { ReactNode } from 'react';

import { CONTAINER } from '@/components/site/page-parts';
import { SiteFooter } from '@/components/site/site-footer';
import { SiteHeader } from '@/components/site/site-header';
import { cn } from '@/lib/ui/cn';
import loginPhoto from '@/public/images/auth/login.jpg';
import signupPhoto from '@/public/images/auth/signup.jpg';

/**
 * The shell for the auth screens (/login, /signup, choose a role, reset a password, verify),
 * inside the same header and footer as the rest of the public site.
 *
 * TWO SHAPES.
 *   - /login and /signup (`photo`): a split screen from `lg`. The form keeps one calm, narrow
 *     column (28rem) on the left, open on the page with no panel around it; a framed photograph
 *     fills the right. One photo per screen, never shared: the sign-in desk and the sign-up
 *     portfolio screen. Below `lg` the photo is left out, so a phone opens straight on the form.
 *   - Everything else: the same narrow column, centred, with no photo. These screens are one
 *     step inside a flow, and a photo there would be decoration doing no job (minimalist-ui).
 *
 * The header drops the button for the screen you are on (`current`), so there is never a
 * "Sign up" button above the sign-up form.
 *
 * PHOTOS: Unsplash License, graded to the site palette, cropped to 3:4.
 *   login.jpg   Huy Phan,   https://unsplash.com/photos/VXpeQ3GetDU
 *   signup.jpg  Piotr Wilk, https://unsplash.com/photos/K-YcSC3Fvrg
 */
const PHOTOS = {
  login: {
    src: loginPhoto,
    alt: 'A tidy, lived-in desk with a laptop, a monitor and a keyboard by a window',
  },
  signup: {
    src: signupPhoto,
    alt: 'A monitor and a laptop on a white desk, both showing a developer portfolio site',
  },
} as const;

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
  photo,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** The split-screen photograph, on /login and /signup only. */
  photo?: keyof typeof PHOTOS;
}) {
  const image = photo ? PHOTOS[photo] : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader current={photo} />

      <main
        id="main"
        className={cn(
          CONTAINER,
          'grid flex-1 py-10 sm:py-16',
          image
            ? 'lg:grid-cols-12 lg:items-start lg:gap-12 lg:py-16'
            : 'place-items-start justify-center sm:place-items-center',
        )}
      >
        <div className={cn('w-full max-w-md animate-rise', image && 'lg:col-span-5')}>
          <h1 className="text-display-sm">{title}</h1>
          {subtitle && <p className="mt-3 text-text-muted">{subtitle}</p>}
          <div className="mt-10">{children}</div>
          {footer && (
            <p className="mt-10 border-t border-border-base pt-6 text-sm text-text-muted">
              {footer}
            </p>
          )}
        </div>

        {image && (
          // From `lg` only: on a phone the form is the whole job. Top-aligned with the heading
          // and sticky below the floating header, so it stays beside a form taller than the
          // screen. The LCP element on desktop, so preloaded at high priority, never faded in.
          <figure className="frame-tray sticky top-24 hidden lg:col-span-6 lg:col-start-7 lg:block">
            <div className="rounded-inner relative aspect-3/4 max-h-[calc(100svh-9rem)] w-full overflow-hidden bg-surface-sunken">
              <Image
                src={image.src}
                alt={image.alt}
                fill
                preload
                fetchPriority="high"
                placeholder="blur"
                sizes="(min-width: 1024px) 36rem, 1px"
                className="object-cover"
              />
            </div>
          </figure>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

export { OrDivider } from './or-divider';
