'use client';

import { ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { HeroVideo } from '@/components/marketing/hero-video';
import { MATCHES } from '../sample';

/**
 * Direction 1 — TERMINAL.
 * Axis: personality. Dark-first, monospace metadata, grid rules, one electric accent. Speaks
 * the audience's own visual language — the product looks like the tools developers already
 * trust, and clients read that as "these people know the work".
 */
export function TerminalLanding() {
  const [side, setSide] = useState<'dev' | 'client'>('dev');

  return (
    <div className="proto v-terminal min-h-screen bg-[#0b0d0c] font-sans text-[#e8ede9]">
      <style>{`
        .v-terminal ::selection { background: #c6f24e; color: #0b0d0c; }
        .v-terminal :focus-visible { outline: 2px solid #c6f24e; outline-offset: 2px; }
      `}</style>

      <header className="sticky top-0 z-(--z-nav) border-b border-white/10 bg-[#0b0d0c]/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-mono text-sm font-medium tracking-tight"
          >
            <span className="grid size-6 place-items-center rounded-md bg-[#c6f24e] text-[11px] font-bold text-[#0b0d0c]">
              ts
            </span>
            techselect
          </Link>
          <nav
            aria-label="Browse"
            className="hidden items-center gap-1 font-mono text-[13px] text-[#8a958f] sm:flex"
          >
            <Link
              href="/jobs"
              className="rounded-md px-2.5 py-1.5 hover:bg-white/5 hover:text-white"
            >
              ./jobs
            </Link>
            <Link
              href="/talent"
              className="rounded-md px-2.5 py-1.5 hover:bg-white/5 hover:text-white"
            >
              ./developers
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <Link href="/login" className="rounded-md px-3 py-1.5 text-[#8a958f] hover:text-white">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="pressable rounded-md bg-[#c6f24e] px-3 py-1.5 font-medium text-[#0b0d0c] hover:bg-[#d4f76e]"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <section className="relative isolate overflow-hidden border-b border-white/10">
        <HeroVideo
          poster="/video/hero-poster.jpg"
          webm="/video/hero.webm"
          mp4="/video/hero.mp4"
          label="a developer writing code at a laptop"
        />
        {/* Scrim: solid on the text side, lifting towards the laptop. Measured against the
            brightest poster pixel under the copy, it holds white text above 7:1. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(90deg,#0b0d0c_0%,rgba(11,13,12,0.9)_45%,rgba(11,13,12,0.55)_100%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px]"
        />

        <div className="relative mx-auto max-w-6xl px-4 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <p className="rise font-mono text-[13px] text-[#c6f24e]">
            <span className="text-[#8a958f]">~/</span>matching by evidence
          </p>
          <h1 className="rise rise-1 mt-5 max-w-3xl text-[2.6rem] leading-[1.02] font-semibold tracking-[-0.035em] text-balance sm:text-7xl">
            Work found by what you <span className="text-[#c6f24e]">actually&nbsp;ship.</span>
          </h1>
          <p className="rise rise-2 mt-6 max-w-xl text-lg text-[#b4beb8] text-pretty">
            A job board for software, web and automation work. Matching reads the projects you
            describe and the brief a client writes — not whether the same keyword appears in both.
          </p>
          <div className="rise rise-3 mt-9 flex flex-wrap gap-3">
            <Link
              href="/signup?role=talent"
              className="pressable inline-flex h-12 items-center gap-2 rounded-lg bg-[#c6f24e] px-5 font-medium text-[#0b0d0c] hover:bg-[#d4f76e]"
            >
              I&rsquo;m looking for work <ArrowRight aria-hidden="true" size={18} />
            </Link>
            <Link
              href="/signup?role=client"
              className="pressable inline-flex h-12 items-center rounded-lg border border-white/20 bg-white/5 px-5 font-medium backdrop-blur-sm hover:bg-white/10"
            >
              I&rsquo;m hiring
            </Link>
          </div>
          <p className="rise rise-4 mt-5 font-mono text-[13px] text-[#8a958f]">
            No approval queue, nothing to qualify for —{' '}
            <Link href="/jobs" className="text-[#e8ede9] underline underline-offset-4">
              browse without an account
            </Link>
          </p>
        </div>
      </section>

      {/* The product, shown as its own output. Sample data, labelled as such. */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:items-center">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">A reason, every time.</h2>
            <p className="mt-3 max-w-md text-[#b4beb8] text-pretty">
              Every match carries one sentence saying why — including where it falls short. When
              nothing fits, it says that instead of padding the list.
            </p>
          </div>
          <div className="overflow-hidden rounded-xl border border-white/10 bg-[#111412] shadow-[0_24px_80px_-24px_rgba(198,242,78,0.18)]">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
              <span className="size-2.5 rounded-full bg-white/15" />
              <span className="size-2.5 rounded-full bg-white/15" />
              <span className="size-2.5 rounded-full bg-white/15" />
              <span className="ml-2 font-mono text-xs text-[#8a958f]">matches — sample</span>
            </div>
            <ol className="divide-y divide-white/[0.07] font-mono text-[13px]">
              {MATCHES.map((m, i) => (
                <li key={m.title} className="grid grid-cols-[2rem_1fr_auto] gap-x-3 px-4 py-4">
                  <span className="text-[#8a958f]">{String(i + 1).padStart(2, '0')}</span>
                  <div className="min-w-0 font-sans">
                    <p className="font-medium text-[#e8ede9]">{m.title}</p>
                    <p className="mt-1 text-sm text-[#b4beb8] text-pretty">{m.reason}</p>
                  </div>
                  <span
                    className={`tabular-nums ${m.score >= 80 ? 'text-[#c6f24e]' : 'text-[#8a958f]'}`}
                  >
                    {m.score}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0e110f]">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
            <div
              role="tablist"
              aria-label="Who it's for"
              className="flex rounded-lg border border-white/10 p-1 font-mono text-[13px]"
            >
              {(
                [
                  ['dev', 'for developers'],
                  ['client', 'for clients'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={side === key}
                  onClick={() => setSide(key)}
                  className={`rounded-md px-3 py-1.5 ${side === key ? 'bg-white/10 text-white' : 'text-[#8a958f] hover:text-white'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <ol className="mt-10 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-3">
            {(side === 'dev'
              ? [
                  [
                    'Describe what you built',
                    'A headline, a bio and a couple of projects — or just a link to your site.',
                  ],
                  [
                    'Get briefs that fit',
                    'Ranked against the work you have shipped, with the reason for each.',
                  ],
                  [
                    'Apply with the evidence',
                    'Clients see the projects behind your note, not a keyword score.',
                  ],
                ]
              : [
                  [
                    'Write the brief',
                    'What needs building and what done looks like. Matching reads it closely.',
                  ],
                  [
                    'See who fits',
                    'Applicants ordered by fit, plus developers who fit and have not applied yet.',
                  ],
                  [
                    'Decide for yourself',
                    'No score attached to a person — the order and a sentence of reasoning.',
                  ],
                ]
            ).map(([title, body], i) => (
              <li key={title} className="bg-[#0b0d0c] p-6">
                <span className="font-mono text-[13px] text-[#c6f24e]">0{i + 1}</span>
                <h3 className="mt-3 font-medium">{title}</h3>
                <p className="mt-1.5 text-sm text-[#b4beb8] text-pretty">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <ul className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
          {[
            'Open to every developer — anyone who wants to be listed is listed.',
            'Search and filters work without any AI at all.',
            'No fees, no middleman, no contracts to sign here.',
            'Delete your account from settings, and it genuinely deletes.',
          ].map((line) => (
            <li key={line} className="flex gap-3 text-[#b4beb8]">
              <Check aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-[#c6f24e]" />
              {line}
            </li>
          ))}
        </ul>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-8 font-mono text-[13px] text-[#8a958f]">
          <span>techselect — open to every developer; clients decide.</span>
          <Link href="/privacy" className="hover:text-white">
            privacy
          </Link>
          <Link href="/terms" className="hover:text-white">
            terms
          </Link>
        </div>
      </footer>
    </div>
  );
}
