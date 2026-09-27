import { ArrowRight, BadgeCheck, MessageSquare, Search, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { HeroVideo } from '@/components/marketing/hero-video';
import { MATCHES } from '../sample';

/**
 * Direction 3 — SIGNAL.
 * Axis: interaction model / elevation. Crisp product UI: soft layered cards, a cobalt accent,
 * the video framed as a product window with a live match floating over it. Sells by showing
 * the interface doing its job, the way modern SaaS landings do — the page is a demo.
 */
export function SignalLanding() {
  const top = MATCHES[0];

  return (
    <div className="proto v-signal min-h-screen bg-[#fafafb] text-[#0f1115]">
      <style>{`
        .v-signal :focus-visible { outline: 2px solid #3448e0; outline-offset: 2px; }
        .v-signal .card { background: #fff; border: 1px solid #e7e7ec; box-shadow: 0 1px 2px rgba(15,17,21,.04), 0 8px 24px -8px rgba(15,17,21,.08); }
      `}</style>

      <header className="sticky top-0 z-(--z-nav) border-b border-[#e7e7ec]/80 bg-[#fafafb]/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid size-7 place-items-center rounded-lg bg-[#3448e0] text-white">
              <Sparkles aria-hidden="true" size={15} />
            </span>
            TechSelect
          </Link>
          <nav aria-label="Browse" className="hidden gap-1 text-sm text-[#5c6170] sm:flex">
            <Link
              href="/jobs"
              className="rounded-lg px-3 py-2 hover:bg-black/[0.04] hover:text-[#0f1115]"
            >
              Jobs
            </Link>
            <Link
              href="/talent"
              className="rounded-lg px-3 py-2 hover:bg-black/[0.04] hover:text-[#0f1115]"
            >
              Developers
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-[#5c6170] hover:text-[#0f1115]"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="pressable rounded-lg bg-[#0f1115] px-3.5 py-2 font-medium text-white hover:bg-black"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[64rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(52,72,224,0.14),transparent)]"
        />
        <div className="relative mx-auto max-w-6xl px-4 pt-16 text-center sm:pt-24">
          <p className="rise mx-auto inline-flex items-center gap-2 rounded-full border border-[#e7e7ec] bg-white px-3 py-1 text-xs font-medium text-[#5c6170]">
            <span className="size-1.5 rounded-full bg-[#1f9d55]" /> Software, web &amp; automation
            work
          </p>
          <h1 className="rise rise-1 mx-auto mt-6 max-w-3xl text-[2.6rem] leading-[1.05] font-semibold tracking-[-0.04em] text-balance sm:text-[4.25rem]">
            Work found by what you actually do.
          </h1>
          <p className="rise rise-2 mx-auto mt-5 max-w-xl text-lg text-[#5c6170] text-pretty">
            Matching reads the projects you describe and the brief a client writes — and tells you
            in one sentence why they fit.
          </p>
          <div className="rise rise-3 mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup?role=talent"
              className="pressable inline-flex h-12 items-center gap-2 rounded-xl bg-[#3448e0] px-5 font-medium text-white shadow-[0_8px_20px_-6px_rgba(52,72,224,0.5)] hover:bg-[#2a3cc7]"
            >
              I&rsquo;m looking for work <ArrowRight aria-hidden="true" size={18} />
            </Link>
            <Link
              href="/signup?role=client"
              className="pressable card inline-flex h-12 items-center rounded-xl px-5 font-medium hover:border-[#d2d2da]"
            >
              I&rsquo;m hiring
            </Link>
          </div>
          <p className="rise rise-4 mt-4 text-sm text-[#5c6170]">
            No approval queue and nothing to qualify for.{' '}
            <Link href="/jobs" className="font-medium text-[#0f1115] underline underline-offset-4">
              Browse without an account
            </Link>
          </p>
        </div>

        {/* The product window. The video is the "screen", the match card is the product. */}
        <div className="rise rise-4 relative mx-auto mt-14 max-w-5xl px-4 pb-24">
          <div className="card overflow-hidden rounded-2xl p-1.5">
            <div className="flex items-center gap-1.5 px-3 py-2">
              <span className="size-2.5 rounded-full bg-[#e7e7ec]" />
              <span className="size-2.5 rounded-full bg-[#e7e7ec]" />
              <span className="size-2.5 rounded-full bg-[#e7e7ec]" />
            </div>
            <div className="relative aspect-[16/8] overflow-hidden rounded-xl bg-[#0f1115]">
              <HeroVideo
                poster="/video/hero-poster.jpg"
                webm="/video/hero.webm"
                mp4="/video/hero.mp4"
                label="a developer writing code at a laptop"
              />
            </div>
          </div>
          <div className="card absolute right-6 -bottom-2 w-[min(22rem,calc(100%-3rem))] rounded-2xl p-4 text-left sm:right-10">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-[#5c6170]">New match · sample</p>
              <span className="rounded-full bg-[#3448e0]/10 px-2 py-0.5 text-xs font-semibold text-[#3448e0] tabular-nums">
                {top.score}
              </span>
            </div>
            <p className="mt-2 font-medium">{top.title}</p>
            <p className="mt-1.5 line-clamp-3 text-sm text-[#5c6170]">{top.reason}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: BadgeCheck,
              title: 'Evidence, not keywords',
              body: 'Someone who shipped the work outranks someone who listed the tool.',
            },
            {
              icon: MessageSquare,
              title: 'A reason, every time',
              body: 'One sentence per match — including where it falls short.',
            },
            {
              icon: Search,
              title: 'Works without AI too',
              body: 'Search and filters find everything; matching is a head start.',
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="card lift rounded-2xl p-6">
              <span className="grid size-10 place-items-center rounded-xl bg-[#3448e0]/10 text-[#3448e0]">
                <Icon aria-hidden="true" size={20} />
              </span>
              <h2 className="mt-5 font-semibold tracking-tight">{title}</h2>
              <p className="mt-1.5 text-sm text-[#5c6170] text-pretty">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#e7e7ec]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-8 text-sm text-[#5c6170]">
          <span>TechSelect — open to every developer; clients decide.</span>
          <Link href="/privacy" className="ml-auto hover:text-[#0f1115]">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-[#0f1115]">
            Terms
          </Link>
        </div>
      </footer>
    </div>
  );
}
