import { Briefcase, Home, MessageSquare, Search, User } from 'lucide-react';
import Link from 'next/link';

import { ACTIVITY, MATCHES, PROFILE } from '../sample';

const NAV = [
  [Home, 'Home', true],
  [Search, 'Search', false],
  [Briefcase, 'Jobs', false],
  [MessageSquare, 'Messages', false],
  [User, 'Profile', false],
] as const;

/** Direction 1 — TERMINAL, applied to the developer's home. Dense rows, sidebar, mono data. */
export function TerminalDashboard() {
  return (
    <div className="proto v-terminal min-h-screen bg-[#0b0d0c] text-[#e8ede9] lg:grid lg:grid-cols-[15rem_1fr]">
      <style>{`.v-terminal :focus-visible { outline: 2px solid #c6f24e; outline-offset: 2px; }`}</style>

      <aside className="hidden border-r border-white/10 lg:block">
        <div className="sticky top-0 flex h-screen flex-col p-3">
          <Link href="/" className="flex items-center gap-2 px-2 py-3 font-mono text-sm">
            <span className="grid size-6 place-items-center rounded-md bg-[#c6f24e] text-[11px] font-bold text-[#0b0d0c]">
              ts
            </span>
            techselect
          </Link>
          <nav aria-label="Main" className="mt-4 space-y-0.5">
            {NAV.map(([Icon, label, active]) => (
              <a
                key={label}
                href="#"
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-md px-2.5 py-2 text-sm ${active ? 'bg-white/[0.07] text-white' : 'text-[#8a958f] hover:bg-white/5 hover:text-white'}`}
              >
                <Icon aria-hidden="true" size={16} />
                {label}
                {label === 'Messages' && (
                  <span className="ml-auto rounded bg-[#c6f24e] px-1.5 font-mono text-[11px] text-[#0b0d0c]">
                    {PROFILE.stats.unread}
                  </span>
                )}
              </a>
            ))}
          </nav>
          <p className="mt-auto px-2 font-mono text-[11px] text-[#8a958f]">
            viewing as talent · switch
          </p>
        </div>
      </aside>

      <main id="main" className="px-4 pt-6 pb-28 lg:px-10 lg:pt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[13px] text-[#8a958f]">~/home</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Good afternoon, {PROFILE.name}
            </h1>
          </div>
          <p className="font-mono text-[13px] text-[#8a958f]">
            profile: <span className="text-[#c6f24e]">published</span>
          </p>
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-4">
          {(
            [
              ['applications', PROFILE.stats.applications],
              ['shortlisted', PROFILE.stats.shortlisted],
              ['saved', PROFILE.stats.saved],
              ['unread', PROFILE.stats.unread],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="bg-[#0b0d0c] px-4 py-3">
              <dt className="font-mono text-[11px] text-[#8a958f]">{k}</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>

        <section className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 className="font-medium">Matches</h2>
            <a href="#" className="font-mono text-[13px] text-[#8a958f] hover:text-white">
              view all →
            </a>
          </div>
          <ol className="mt-3 divide-y divide-white/[0.07] rounded-lg border border-white/10">
            {MATCHES.map((m) => (
              <li key={m.title} className="grid gap-x-4 gap-y-1 p-4 sm:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <a href="#" className="font-medium hover:text-[#c6f24e]">
                    {m.title}
                  </a>
                  <p className="mt-0.5 font-mono text-[12px] text-[#8a958f]">
                    {m.company} · {m.meta} · {m.budget}
                  </p>
                  <p className="mt-2 text-sm text-[#b4beb8] text-pretty">{m.reason}</p>
                </div>
                <span
                  className={`font-mono text-lg tabular-nums sm:text-right ${m.score >= 80 ? 'text-[#c6f24e]' : 'text-[#8a958f]'}`}
                >
                  {m.score}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-white/10 p-4">
            <h2 className="font-medium">Profile checks</h2>
            <ul className="mt-3 space-y-2 font-mono text-[13px]">
              {PROFILE.strength.map((s) => (
                <li key={s.label} className={s.done ? 'text-[#8a958f]' : 'text-[#e8ede9]'}>
                  <span className={s.done ? 'text-[#c6f24e]' : 'text-[#f2b84e]'}>
                    {s.done ? '[x]' : '[ ]'}
                  </span>{' '}
                  {s.label}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-white/10 p-4">
            <h2 className="font-medium">Activity</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {ACTIVITY.map((a) => (
                <li key={a.text} className="flex justify-between gap-4">
                  <span className="text-[#b4beb8]">{a.text}</span>
                  <span className="shrink-0 font-mono text-[12px] text-[#8a958f]">{a.when}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-(--z-nav) grid grid-cols-5 border-t border-white/10 bg-[#0b0d0c]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        {NAV.map(([Icon, label, active]) => (
          <a
            key={label}
            href="#"
            className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${active ? 'text-[#c6f24e]' : 'text-[#8a958f]'}`}
          >
            <Icon aria-hidden="true" size={20} />
            {label}
          </a>
        ))}
      </nav>
    </div>
  );
}
