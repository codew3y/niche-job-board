/**
 * A redirect target taken from a request (`next`, `returnTo`), accepted only if it stays on this
 * site. Anything else returns null, and the caller falls back to its own default.
 *
 * `startsWith('/') && !startsWith('//')` was the check everywhere before this, and it is not
 * enough: browsers treat a backslash as a slash, so `/\evil.com` passes it and still lands on
 * evil.com, and a tab or newline inside `//` is stripped by the URL parser to the same effect.
 * Resolving against a placeholder origin and checking the origin survived is what a browser
 * would actually do with the value.
 */
export function safePath(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return null;
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return null;
  const base = 'https://same-origin.invalid';
  try {
    return new URL(value, base).origin === base ? value : null;
  } catch {
    return null;
  }
}
