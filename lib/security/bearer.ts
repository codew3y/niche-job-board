/**
 * Shared-secret checks for the two machine-facing routes (/api/match/warm, /api/health).
 *
 * Compared in constant time, because a timing-variable comparison on a secret leaks it one
 * character at a time to anyone patient enough to measure.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * True when the request carries `Authorization: Bearer <secret>` for a configured secret.
 * An unset secret never matches: not configured is a refusal, never a bypass.
 */
export function hasBearer(request: Request, secret: string | undefined): boolean {
  if (!secret) return false;
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  return timingSafeEqual(supplied, secret);
}
