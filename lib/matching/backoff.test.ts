import { describe, expect, it, vi } from 'vitest';

import { delayFor, withRetry } from './backoff';

describe('delayFor', () => {
  it('grows exponentially at the ceiling', () => {
    const top = () => 0.999999;
    expect(delayFor(1, { baseMs: 500, random: top })).toBe(499);
    expect(delayFor(2, { baseMs: 500, random: top })).toBe(999);
    expect(delayFor(3, { baseMs: 500, random: top })).toBe(1999);
  });

  it('CAPS, so a long outage does not produce an hour-long wait', () => {
    expect(delayFor(20, { baseMs: 500, maxMs: 20_000, random: () => 0.999999 })).toBe(19_999);
  });

  it('USES FULL JITTER — the delay spans zero to the ceiling', () => {
    // Fixed doubling retries every job rate-limited in the same window at the same instant,
    // so the second wave is as thick as the first. This is the property that prevents that.
    expect(delayFor(3, { baseMs: 500, random: () => 0 })).toBe(0);
    expect(delayFor(3, { baseMs: 500, random: () => 0.5 })).toBe(1000);
  });
});

describe('withRetry', () => {
  const sleep = () => Promise.resolve();

  it('returns the first success without retrying', async () => {
    const task = vi.fn(async () => ({ ok: true as const, value: 'done' }));
    const result = await withRetry(task, { sleep });
    expect(result).toEqual({ ok: true, value: 'done', attempts: 1 });
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('retries a retryable failure and succeeds', async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls++;
        return calls < 3
          ? { ok: false as const, retryable: true, detail: '429' }
          : { ok: true as const, value: 'eventually' };
      },
      { sleep },
    );
    expect(result).toEqual({ ok: true, value: 'eventually', attempts: 3 });
  });

  it('STOPS IMMEDIATELY on a non-retryable failure', async () => {
    // A 400 will be a 400 every time. Retrying burns quota and delays the dead-letter row.
    const task = vi.fn(async () => ({ ok: false as const, retryable: false, detail: '400 bad' }));
    const result = await withRetry(task, { sleep });
    expect(task).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: false, attempts: 1, detail: '400 bad' });
  });

  it('gives up after the attempt budget and reports the last reason', async () => {
    const task = vi.fn(async () => ({ ok: false as const, retryable: true, detail: '503' }));
    const result = await withRetry(task, { attempts: 4, sleep });
    expect(task).toHaveBeenCalledTimes(4);
    expect(result).toEqual({ ok: false, attempts: 4, detail: '503' });
  });

  it('does not sleep after the final attempt', async () => {
    const sleepSpy = vi.fn(async () => {});
    await withRetry(async () => ({ ok: false as const, retryable: true }), {
      attempts: 3,
      sleep: sleepSpy,
    });
    // Three attempts means two gaps, not three.
    expect(sleepSpy).toHaveBeenCalledTimes(2);
  });

  it('passes the attempt number through, so a task can log which try it is on', async () => {
    const seen: number[] = [];
    await withRetry(
      async (attempt) => {
        seen.push(attempt);
        return { ok: false as const, retryable: true };
      },
      { attempts: 3, sleep },
    );
    expect(seen).toEqual([1, 2, 3]);
  });
});
