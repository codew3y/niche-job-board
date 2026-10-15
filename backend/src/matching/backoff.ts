/**
 * Retry with exponential backoff and full jitter.
 *
 * Pure and dependency-free so it can be tested without a clock or a network — the schedule is
 * the part worth getting right, and a test that waits four real seconds to prove it does not
 * get run.
 *
 * FULL JITTER, not fixed doubling. Every embedding job that fails during a rate-limit window
 * fails at roughly the same moment, so a fixed schedule retries them all at the same moment
 * too, and the second wave is as thick as the first. Randomising across the whole interval
 * spreads them out. (AWS's "Exponential Backoff and Jitter" is the canonical write-up; full
 * jitter wins there and the reasoning holds here.)
 */

export type BackoffOptions = {
  attempts?: number;
  baseMs?: number;
  maxMs?: number;
  /** Injected so tests are deterministic. Defaults to Math.random. */
  random?: () => number;
};

export const DEFAULT_ATTEMPTS = 4;
const DEFAULT_BASE_MS = 500;
const DEFAULT_MAX_MS = 20_000;

/** Delay before attempt `n` (1-indexed: attempt 1 is the first retry). */
export function delayFor(attempt: number, options: BackoffOptions = {}): number {
  const base = options.baseMs ?? DEFAULT_BASE_MS;
  const max = options.maxMs ?? DEFAULT_MAX_MS;
  const random = options.random ?? Math.random;
  const ceiling = Math.min(max, base * 2 ** Math.max(0, attempt - 1));
  return Math.floor(random() * ceiling);
}

export type Attempt<T> =
  { ok: true; value: T } | { ok: false; retryable: boolean; detail?: string };

export type RunResult<T> =
  { ok: true; value: T; attempts: number } | { ok: false; attempts: number; detail?: string };

/**
 * Run `task` until it succeeds, gives a non-retryable failure, or runs out of attempts.
 *
 * A non-retryable failure stops immediately. Retrying a 400 burns quota, delays the
 * dead-letter row that would actually tell someone, and cannot succeed.
 */
export async function withRetry<T>(
  task: (attempt: number) => Promise<Attempt<T>>,
  options: BackoffOptions & { sleep?: (ms: number) => Promise<void> } = {},
): Promise<RunResult<T>> {
  const attempts = options.attempts ?? DEFAULT_ATTEMPTS;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));

  let lastDetail: string | undefined;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const result = await task(attempt);
    if (result.ok) return { ok: true, value: result.value, attempts: attempt };

    lastDetail = result.detail;
    if (!result.retryable) return { ok: false, attempts: attempt, detail: result.detail };
    // No sleep after the final attempt — waiting to return a failure helps nobody.
    if (attempt < attempts) await sleep(delayFor(attempt, options));
  }

  return { ok: false, attempts, detail: lastDetail };
}
