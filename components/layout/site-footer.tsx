import Link from 'next/link';

/**
 * The public footer. Legal links from every public page, not only from Google's consent
 * screen — a policy reachable only by those who already went looking is not really published.
 */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border-base">
      <div className="gutter mx-auto grid max-w-6xl gap-8 py-12 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-serif text-2xl">TechSelect</p>
          <p className="mt-2 max-w-xs text-sm text-text-muted text-pretty">
            A job board for software, web and automation work. Open to every developer; clients
            decide.
          </p>
        </div>
        <nav aria-label="Browse the board" className="text-sm">
          <p className="mb-3 text-xs font-medium tracking-eyebrow text-text-subtle uppercase">
            Browse
          </p>
          <ul className="space-y-2">
            <li>
              <Link href="/jobs" className="text-text-muted hover:text-text">
                Jobs
              </Link>
            </li>
            <li>
              <Link href="/talent" className="text-text-muted hover:text-text">
                Developers
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Legal" className="text-sm">
          <p className="mb-3 text-xs font-medium tracking-eyebrow text-text-subtle uppercase">
            Legal
          </p>
          <ul className="space-y-2">
            <li>
              <Link href="/privacy" className="text-text-muted hover:text-text">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="text-text-muted hover:text-text">
                Terms
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
