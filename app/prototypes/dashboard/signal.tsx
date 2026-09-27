import {
  ArrowRight,
  Bookmark,
  Briefcase,
  CheckCircle2,
  Circle,
  Home,
  MessageSquare,
  Search,
  Sparkles,
  User,
} from 'lucide-react';
import Link from 'next/link';

import { ACTIVITY, MATCHES, PROFILE } from '../sample';

const NAV = [
  [Home, 'Home'],
  [Search, 'Search'],
  [Briefcase, 'Jobs'],
  [MessageSquare, 'Messages'],
  [User, 'Profile'],
] as const;

/** Direction 3 — SIGNAL, applied to the developer's home. Stat tiles, two-column cards. */
export function SignalDashboard() {
  const done = PROFILE.strength.filter((s) => s.done).length;
  const pct = Math.round((done / PROFILE.strength.length) * 100);

  return (
    <div className="proto v-signal min-h-screen bg-[#fafafb] text-[#0f1115]">
      <style>{`
        .v-signal :focus-visible { outline: 2px solid #3448e0; outline-offset: 2px; }
        .v-signal .card { background: #fff; border: 1px solid #e7e7ec; box-shadow: 0 1px 2px rgba(15,17,21,.04), 0 8px 24px -12px rgba(15,17,21,.08); }
      `}</style>

      <header className="sticky top-0 z-nav border-b border-[#e7e7ec] bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid size-7 place-items-center rounded-lg bg-[#3448e0] text-white">
              <Sparkles aria-hidden="true" size={15} />
            </span>
            TechSelect
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-1 text-sm sm:flex">
            {NAV.map(([, label], i) => (
              <a
                key={label}
                href="#"
                aria-current={i === 0 ? 'page' : undefined}
                className={`rounded-lg px-3 py-2 ${i === 0 ? 'bg-black/[0.05] font-medium' : 'text-[#5c6170] hover:bg-black/[0.04] hover:text-[#0f1115]'}`}
              >
                {label}
                {label === 'Messages' && (
                  <span className="ml-1.5 rounded-full bg-[#3448e0] px-1.5 text-[11px] font-semibold text-white">
                    {PROFILE.stats.unread}
                  </span>
                )}
              </a>
            ))}
          </nav>
          <span className="ml-auto grid size-8 place-items-center rounded-full bg-[#3448e0]/10 text-sm font-semibold text-[#3448e0]">
            S
          </span>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 pt-8 pb-28 sm:pb-12">
        <h1 className="text-2xl font-semibold tracking-tight">Good afternoon, {PROFILE.name}</h1>
        <p className="mt-1 text-[#5c6170]">Your profile is live and being matched to new briefs.</p>

        <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(
            [
              [Briefcase, 'Applications', PROFILE.stats.applications],
              [CheckCircle2, 'Shortlisted', PROFILE.stats.shortlisted],
              [Bookmark, 'Saved jobs', PROFILE.stats.saved],
              [MessageSquare, 'Unread', PROFILE.stats.unread],
            ] as const
          ).map(([Icon, label, value]) => (
            <div key={label} className="card lift rounded-2xl p-4">
              <dt className="flex items-center gap-2 text-sm text-[#5c6170]">
                <Icon aria-hidden="true" size={16} />
                {label}
              </dt>
              <dd className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <section className="card rounded-2xl">
            <div className="flex items-center justify-between border-b border-[#e7e7ec] px-5 py-4">
              <h2 className="font-semibold tracking-tight">Top matches</h2>
              <a
                href="#"
                className="inline-flex items-center gap-1 text-sm font-medium text-[#3448e0]"
              >
                View all <ArrowRight aria-hidden="true" size={14} />
              </a>
            </div>
            <ul className="divide-y divide-[#e7e7ec]">
              {MATCHES.map((m) => (
                <li key={m.title} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <a href="#" className="font-medium hover:text-[#3448e0]">
                        {m.title}
                      </a>
                      <p className="mt-0.5 text-sm text-[#5c6170]">
                        {m.company} · {m.meta}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-sm font-semibold tabular-nums ${m.score >= 80 ? 'bg-[#3448e0]/10 text-[#3448e0]' : 'bg-black/[0.05] text-[#5c6170]'}`}
                    >
                      {m.score}
                    </span>
                  </div>
                  <p className="mt-2 rounded-xl bg-[#f4f5f8] p-3 text-sm text-[#3d4250] text-pretty">
                    {m.reason}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <div className="space-y-6">
            <section className="card rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold tracking-tight">Profile strength</h2>
                <span className="text-sm font-semibold tabular-nums">{pct}%</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#eef0f4]">
                <div className="h-full rounded-full bg-[#3448e0]" style={{ width: `${pct}%` }} />
              </div>
              <ul className="mt-4 space-y-2.5 text-sm">
                {PROFILE.strength.map((s) => (
                  <li key={s.label} className="flex items-center gap-2.5">
                    {s.done ? (
                      <CheckCircle2 aria-hidden="true" size={16} className="text-[#1f9d55]" />
                    ) : (
                      <Circle aria-hidden="true" size={16} className="text-[#b7bac4]" />
                    )}
                    <span className={s.done ? 'text-[#5c6170]' : 'font-medium'}>{s.label}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="card rounded-2xl p-5">
              <h2 className="font-semibold tracking-tight">Recent activity</h2>
              <ul className="mt-3 space-y-3 text-sm">
                {ACTIVITY.map((a) => (
                  <li key={a.text} className="flex justify-between gap-3">
                    <span>{a.text}</span>
                    <span className="shrink-0 text-[#5c6170]">{a.when}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-nav grid grid-cols-5 border-t border-[#e7e7ec] bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden"
      >
        {NAV.map(([Icon, label], i) => (
          <a
            key={label}
            href="#"
            className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${i === 0 ? 'text-[#3448e0]' : 'text-[#5c6170]'}`}
          >
            <Icon aria-hidden="true" size={20} />
            {label}
          </a>
        ))}
      </nav>
    </div>
  );
}
