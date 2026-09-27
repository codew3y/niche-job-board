import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

import { HeroVideo } from '@/components/marketing/hero-video';
import { MATCHES } from '../sample';

/**
 * Direction 2 — EDITORIAL.
 * Axis: typography and whitespace. Warm paper, a serif display face, hairline rules and
 * editorial numbering. Treats hiring as considered reading rather than a feed — the page
 * slows down on purpose, because the product's whole claim is that it reads carefully.
 */
export function EditorialLanding() {
  const example = MATCHES[0];

  return (
    <div className="proto v-editorial min-h-screen bg-[#f6f3ee] text-[#1b1a17]">
      <style>{`
        .v-editorial .serif { font-family: var(--font-serif), Georgia, serif; font-weight: 400; }
        .v-editorial :focus-visible { outline: 2px solid #b83a0b; outline-offset: 3px; }
        .v-editorial ::selection { background: #1b1a17; color: #f6f3ee; }
      `}</style>

      <header className="border-b border-[#1b1a17]/10">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-5">
          <Link href="/" className="serif text-2xl tracking-tight">
            TechSelect
          </Link>
          <nav aria-label="Browse" className="hidden gap-6 text-sm text-[#6b665e] sm:flex">
            <Link href="/jobs" className="hover:text-[#1b1a17]">
              Jobs
            </Link>
            <Link href="/talent" className="hover:text-[#1b1a17]">
              Developers
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-5 text-sm">
            <Link href="/login" className="text-[#6b665e] hover:text-[#1b1a17]">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="pressable rounded-full bg-[#1b1a17] px-4 py-2 font-medium text-[#f6f3ee] hover:bg-black"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-12 px-5 pt-14 pb-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pt-24">
        <div className="flex flex-col justify-center">
          <p className="rise text-xs font-medium tracking-[0.18em] text-[#b83a0b] uppercase">
            A job board for software, web &amp; automation work
          </p>
          <h1 className="rise rise-1 serif mt-6 text-[3.4rem] leading-[0.95] tracking-[-0.02em] text-balance sm:text-[5.5rem]">
            Hired for the work, <em className="text-[#b83a0b]">not</em> the keywords.
          </h1>
          <p className="rise rise-2 mt-7 max-w-lg text-lg leading-relaxed text-[#4a463f] text-pretty">
            Matching reads the projects you describe and the brief a client writes, then says in one
            sentence why they fit — or that nothing does.
          </p>
          <div className="rise rise-3 mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link
              href="/signup?role=talent"
              className="pressable inline-flex h-12 items-center rounded-full bg-[#1b1a17] px-6 font-medium text-[#f6f3ee] hover:bg-black"
            >
              I&rsquo;m looking for work
            </Link>
            <Link
              href="/signup?role=client"
              className="group inline-flex items-center gap-1.5 font-medium underline decoration-[#1b1a17]/30 underline-offset-[6px] hover:decoration-[#1b1a17]"
            >
              I&rsquo;m hiring
              <ArrowUpRight
                aria-hidden="true"
                size={18}
                className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </Link>
          </div>
          <p className="rise rise-4 mt-8 border-t border-[#1b1a17]/10 pt-5 text-sm text-[#6b665e]">
            No approval queue and nothing to qualify for. You can also{' '}
            <Link href="/jobs" className="text-[#1b1a17] underline underline-offset-2">
              browse without an account
            </Link>
            .
          </p>
        </div>

        <figure className="rise rise-2">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-[#e7e1d6] sm:aspect-[5/4] lg:aspect-[4/5]">
            <HeroVideo
              poster="/video/hero-poster.jpg"
              webm="/video/hero.webm"
              mp4="/video/hero.mp4"
              label="a developer writing code at a laptop"
            />
          </div>
          <figcaption className="mt-3 flex justify-between text-xs text-[#6b665e]">
            <span>Fig. 1 — the work itself.</span>
            <span>Evidence first</span>
          </figcaption>
        </figure>
      </section>

      <section className="border-y border-[#1b1a17]/10 bg-[#efeae2]">
        <div className="mx-auto max-w-4xl px-5 py-20 text-center">
          <p className="text-xs font-medium tracking-[0.18em] text-[#6b665e] uppercase">
            What a match looks like — sample
          </p>
          <blockquote className="serif mt-8 text-3xl leading-snug text-balance sm:text-[2.6rem]">
            &ldquo;{example.reason}&rdquo;
          </blockquote>
          <p className="mt-6 text-sm text-[#6b665e]">
            {example.title} · {example.company} · a {example.score} match
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-24">
        <div className="grid gap-16 md:grid-cols-2">
          {(
            [
              [
                'For developers',
                [
                  [
                    'Describe what you built',
                    'A headline, a bio and a couple of projects — or just your site.',
                  ],
                  ['Get briefs that fit', 'Ranked by the work you have shipped, with the reason.'],
                  ['Apply with the evidence', 'Clients see the projects behind your note.'],
                ],
              ],
              [
                'For clients',
                [
                  ['Write the brief', 'What needs building, and what done looks like.'],
                  [
                    'See who fits',
                    'Applicants ordered by fit, and people who have not applied yet.',
                  ],
                  ['Decide for yourself', 'An order and a reason — never a number on a person.'],
                ],
              ],
            ] as const
          ).map(([heading, steps]) => (
            <div key={heading}>
              <h2 className="serif text-4xl">{heading}</h2>
              <ol className="mt-8 divide-y divide-[#1b1a17]/10 border-y border-[#1b1a17]/10">
                {steps.map(([title, body], i) => (
                  <li key={title} className="grid grid-cols-[3rem_1fr] gap-4 py-5">
                    <span className="serif text-2xl text-[#b83a0b]">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="font-medium">{title}</h3>
                      <p className="mt-1 text-[#4a463f] text-pretty">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#1b1a17]/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-10 text-sm text-[#6b665e]">
          <span className="serif text-lg text-[#1b1a17]">TechSelect</span>
          <span>Open to every developer; clients decide.</span>
          <Link href="/privacy" className="ml-auto hover:text-[#1b1a17]">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-[#1b1a17]">
            Terms
          </Link>
        </div>
      </footer>
    </div>
  );
}
