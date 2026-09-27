import Link from 'next/link';

import { ACTIVITY, MATCHES, PROFILE } from '../sample';

/** Direction 2 — EDITORIAL, applied to the developer's home. One column, reading pace. */
export function EditorialDashboard() {
  return (
    <div className="proto v-editorial min-h-screen bg-[#f6f3ee] text-[#1b1a17]">
      <style>{`
        .v-editorial .serif { font-family: var(--font-serif), Georgia, serif; font-weight: 400; }
        .v-editorial :focus-visible { outline: 2px solid #b83a0b; outline-offset: 3px; }
      `}</style>

      <header className="border-b border-[#1b1a17]/10">
        <div className="mx-auto flex min-h-16 max-w-4xl flex-wrap items-center gap-x-8 gap-y-2 px-5 py-3">
          <Link href="/" className="serif text-2xl">
            TechSelect
          </Link>
          <nav
            aria-label="Main"
            className="-mx-1 flex gap-5 overflow-x-auto px-1 text-sm text-[#6b665e]"
          >
            {['Home', 'Search', 'Jobs', 'Messages', 'Profile'].map((label, i) => (
              <a
                key={label}
                href="#"
                aria-current={i === 0 ? 'page' : undefined}
                className={`shrink-0 py-1 ${i === 0 ? 'border-b border-[#1b1a17] text-[#1b1a17]' : 'hover:text-[#1b1a17]'}`}
              >
                {label}
                {label === 'Messages' && (
                  <sup className="ml-0.5 text-[#b83a0b]">{PROFILE.stats.unread}</sup>
                )}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-4xl px-5 py-14">
        <p className="text-xs font-medium tracking-[0.18em] text-[#6b665e] uppercase">
          Sunday, 27 September
        </p>
        <h1 className="serif mt-4 text-5xl leading-tight tracking-tight sm:text-6xl">
          Good afternoon, {PROFILE.name}.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-[#4a463f] text-pretty">
          Three briefs fit what you have shipped this week. The best of them was posted yesterday.
        </p>

        <ol className="mt-14 divide-y divide-[#1b1a17]/10 border-y border-[#1b1a17]/10">
          {MATCHES.map((m, i) => (
            <li key={m.title} className="grid gap-6 py-8 sm:grid-cols-[4rem_1fr]">
              <span className="serif text-4xl text-[#b83a0b] tabular-nums">{m.score}</span>
              <article>
                <p className="text-xs tracking-wide text-[#6b665e] uppercase">
                  No. {i + 1} · {m.company}
                </p>
                <h2 className="serif mt-2 text-3xl leading-tight">
                  <a
                    href="#"
                    className="hover:underline hover:decoration-1 hover:underline-offset-4"
                  >
                    {m.title}
                  </a>
                </h2>
                <p className="serif mt-3 text-xl leading-snug text-[#4a463f] italic text-pretty">
                  &ldquo;{m.reason}&rdquo;
                </p>
                <p className="mt-3 text-sm text-[#6b665e]">
                  {m.meta} · {m.budget}
                </p>
              </article>
            </li>
          ))}
        </ol>

        <div className="mt-14 grid gap-12 sm:grid-cols-2">
          <section>
            <h2 className="serif text-3xl">Your profile</h2>
            <ul className="mt-4 space-y-2">
              {PROFILE.strength.map((s) => (
                <li
                  key={s.label}
                  className={`flex gap-3 ${s.done ? 'text-[#6b665e] line-through decoration-[#1b1a17]/20' : ''}`}
                >
                  <span aria-hidden="true">{s.done ? '✓' : '○'}</span>
                  {s.label}
                  <span className="sr-only">{s.done ? '(done)' : '(to do)'}</span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="serif text-3xl">Lately</h2>
            <ul className="mt-4 space-y-3">
              {ACTIVITY.map((a) => (
                <li key={a.text} className="text-[#4a463f]">
                  {a.text} <span className="text-sm text-[#6b665e]">— {a.when}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
