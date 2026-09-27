import Link from 'next/link';

/** Index of the prototype surfaces. See DESIGN.md §2 for what each direction is and why one won. */
export default function PrototypesIndex() {
  return (
    <main id="main" className="mx-auto max-w-xl px-4 py-16 font-sans">
      <h1 className="text-2xl font-semibold tracking-tight">Design prototypes</h1>
      <p className="mt-2 text-sm opacity-70">
        Three directions for the landing page and the developer dashboard, behind a picker. Keys 1–3
        or the arrow keys flip between them; R replays the entrance.
      </p>
      <ul className="mt-6 space-y-2">
        <li>
          <Link href="/prototypes/landing" className="underline underline-offset-4">
            Landing page
          </Link>
        </li>
        <li>
          <Link href="/prototypes/dashboard" className="underline underline-offset-4">
            Developer dashboard
          </Link>
        </li>
      </ul>
    </main>
  );
}
