import type { Metadata } from 'next';
import Link from 'next/link';

import { getSessionProfile } from '@/lib/supabase/session';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

/**
 * The front door.
 *
 * SESSION-AWARE, because the previous version was not and that was a real defect: a signed-in
 * user who clicked the logo landed on a page inviting them to "Get started", as though the
 * product had forgotten them. A landing page that ignores the session is a landing page that
 * only works for strangers.
 *
 * The copy avoids the positioning ADR-008 removed. This page used to read "What you've
 * shipped IS the profile", which was true of a product that required a portfolio to publish
 * and false of the one that exists now — anyone may list, and evidence helps rather than
 * admits.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  // Where a deleted account lands. Signing someone out and dropping them on a marketing page
  // with no acknowledgement reads as a failure, not a completion — and this is the one action
  // where "did that work?" cannot be answered by checking.
  const deleted = (await searchParams).deleted === '1';

  // Cached per request, so the layout above and this page share one lookup rather than two.
  const profile = await getSessionProfile();
  const displayName = profile?.displayName ?? null;

  // Somebody mid-onboarding has no role profile yet; send them to finish rather than into a
  // dashboard that would bounce them straight back out.
  const dashboard = profile
    ? profile.hasTalent || profile.hasClient
      ? profile.activeRole === 'client'
        ? '/dashboard/client'
        : '/dashboard/talent'
      : '/select-role'
    : null;

  return (
    <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:py-24">
      {deleted && (
        <p
          role="status"
          className="mx-auto mb-10 max-w-xl rounded-[--radius] border border-border-base bg-surface-sunken p-4 text-center text-sm text-text-muted text-pretty"
        >
          Your account has been deleted. Anything you posted is gone; conversations you were part of
          survive with your side removed, as the privacy policy sets out.
        </p>
      )}
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Work found by what you <span className="text-accent">actually do</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-text-muted text-pretty">
          A job board for software, web and automation work. Matching reads what you have built and
          what a brief actually needs — not whether the same keyword appears in both.
        </p>

        <div className="mt-9 flex flex-wrap justify-center gap-3">
          {dashboard ? (
            <>
              <Link
                href={dashboard}
                className="inline-flex h-11 items-center rounded-[--radius] bg-accent px-6 font-medium text-accent-text shadow-sm transition-[background-color,transform] duration-[--duration-fast] ease-[--ease] hover:bg-accent-hover active:scale-[0.98]"
              >
                {displayName ? `Continue as ${displayName.split(' ')[0]}` : 'Go to your dashboard'}
              </Link>
              <Link
                href="/jobs"
                className="inline-flex h-11 items-center rounded-[--radius] border border-border-strong px-6 font-medium transition-[background-color,transform] duration-[--duration-fast] ease-[--ease] hover:bg-surface-sunken active:scale-[0.98]"
              >
                Browse jobs
              </Link>
            </>
          ) : (
            <>
              {/*
                The role is asked BEFORE the account, not after.
                Previously this was one "Get started" button and the choice came on the far
                side of signup — so someone deciding whether this product is for them had to
                commit first and find out second. Asking here also lets the signup screen
                speak to one audience instead of hedging.
              */}
              <Link
                href="/signup?role=talent"
                className="inline-flex h-11 items-center rounded-[--radius] bg-accent px-6 font-medium text-accent-text shadow-sm transition-[background-color,transform] duration-[--duration-fast] ease-[--ease] hover:bg-accent-hover active:scale-[0.98]"
              >
                I&rsquo;m looking for work
              </Link>
              <Link
                href="/signup?role=client"
                className="inline-flex h-11 items-center rounded-[--radius] border border-border-strong px-6 font-medium transition-[background-color,transform] duration-[--duration-fast] ease-[--ease] hover:bg-surface-sunken active:scale-[0.98]"
              >
                I&rsquo;m hiring
              </Link>
            </>
          )}
        </div>

        {/* Said on the front page rather than discovered later. It is the thing most likely to
            stop someone bouncing, and it is the whole of ADR-008 in one line. */}
        {!dashboard && (
          <p className="mt-5 text-sm text-text-subtle">
            No approval queue and nothing to qualify for. You can also{' '}
            <Link href="/jobs" className="underline underline-offset-2">
              browse without an account
            </Link>
            .
          </p>
        )}
      </div>

      <div className="mt-16 grid gap-6 sm:grid-cols-3">
        {[
          {
            title: 'Evidence, not keywords',
            body: 'Matching reads your bio and the projects you describe. Someone who has shipped the work outranks someone who listed the tool.',
          },
          {
            title: 'A reason, every time',
            body: 'Every match carries one sentence saying why. If nothing fits, it says that instead of padding the list.',
          },
          {
            title: 'Both directions',
            body: 'Clients see ranked candidates for a brief. Developers see briefs that fit what they have built.',
          },
        ].map((card) => (
          <div key={card.title} className="rounded-[--radius] border border-border-base p-5">
            <h2 className="font-medium">{card.title}</h2>
            <p className="mt-1.5 text-sm text-text-muted text-pretty">{card.body}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
