/**
 * Rate limits are enforced by the database (migration 0024): a trigger refuses the write with a
 * message starting "rate_limited:". This recognises that refusal so an action can say so plainly
 * instead of "could not save".
 */
export const isRateLimited = (error: { message?: string } | null | undefined) =>
  Boolean(error?.message?.startsWith('rate_limited:'));
