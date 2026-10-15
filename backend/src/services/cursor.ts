/**
 * Opaque cursors for keyset pagination.
 *
 * Offset pagination silently duplicates and skips rows when the underlying set changes
 * between pages — and on a job board it always does, because someone posts a job while
 * you are reading page 2. Keyset pagination is stable under insertion.
 *
 * Base64 rather than raw values so the shape is not part of the public contract and cannot
 * be hand-crafted into something the query did not expect.
 */

export type Cursor = { at: string; id: string };

export function encodeCursor(c: Cursor): string {
  return Buffer.from(`${c.at}|${c.id}`).toString('base64url');
}

export function decodeCursor(raw: string | undefined | null): Cursor | null {
  if (!raw) return null;
  try {
    const [at, id] = Buffer.from(raw, 'base64url').toString('utf8').split('|');
    if (!at || !id) return null;
    // Reject anything that is not a real timestamp and uuid rather than passing it to the
    // query and hoping.
    if (Number.isNaN(Date.parse(at))) return null;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    return { at, id };
  } catch {
    return null;
  }
}
