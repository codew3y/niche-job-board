import Link from 'next/link';

/**
 * Placeholder landing page. The real marketing page is Phase 3; this exists so the walking
 * skeleton has a front door and the deploy has something to serve.
 */
export default function Home() {
  return (
    <main id="main" className="flex-1 grid place-items-center px-4 py-16">
      <div className="w-full max-w-xl text-center">
        <p className="text-sm font-mono text-text-subtle">Phase 2 · walking skeleton</p>
        <h1 className="mt-4 text-4xl sm:text-5xl font-semibold tracking-tight text-balance">
          What you&rsquo;ve shipped <span className="text-accent">is</span> the profile.
        </h1>
        <p className="mt-5 text-lg text-text-muted text-pretty">
          A job board for software, web and automation work — matched on the evidence of real
          projects rather than on keywords.
        </p>
        <div className="mt-9 flex flex-wrap gap-3 justify-center">
          <Link
            href="/signup"
            className="inline-flex h-11 items-center rounded-[--radius] bg-accent px-6 font-medium text-accent-text shadow-sm transition-[background-color,transform] duration-[--duration-fast] ease-[--ease] hover:bg-accent-hover active:scale-[0.98]"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="inline-flex h-11 items-center rounded-[--radius] border border-border-strong px-6 font-medium transition-[background-color,transform] duration-[--duration-fast] ease-[--ease] hover:bg-surface-sunken active:scale-[0.98]"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
