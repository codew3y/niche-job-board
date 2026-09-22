import { describe, expect, it } from 'vitest';

import { decodeCursor, encodeCursor } from './cursor';

/**
 * Cursors come from the URL, so they are untrusted input that goes straight into a query
 * filter. These tests are about what happens when someone edits one by hand.
 */
describe('cursor round-trip', () => {
  const valid = { at: '2026-09-20T10:00:00.000Z', id: '11111111-1111-4111-8111-111111111111' };

  it('survives encode → decode unchanged', () => {
    expect(decodeCursor(encodeCursor(valid))).toEqual(valid);
  });

  it('is opaque — the values are not readable in the URL', () => {
    const encoded = encodeCursor(valid);
    expect(encoded).not.toContain('2026');
    expect(encoded).not.toContain('1111');
  });

  it('is URL-safe, so it survives a query string without escaping', () => {
    const encoded = encodeCursor(valid);
    expect(encoded).not.toMatch(/[+/=]/);
    expect(encodeURIComponent(encoded)).toBe(encoded);
  });
});

describe('cursor rejects anything it cannot trust', () => {
  it.each([
    ['undefined', undefined],
    ['null', null],
    ['empty', ''],
    ['not base64', '!!!!'],
    ['base64 but not our shape', Buffer.from('hello').toString('base64url')],
    ['missing the id half', Buffer.from('2026-09-20T10:00:00Z|').toString('base64url')],
    [
      'missing the date half',
      Buffer.from('|11111111-1111-4111-8111-111111111111').toString('base64url'),
    ],
    [
      'date is not a date',
      Buffer.from('tomorrow|11111111-1111-4111-8111-111111111111').toString('base64url'),
    ],
    ['id is not a uuid', Buffer.from('2026-09-20T10:00:00Z|drop table jobs').toString('base64url')],
  ])('returns null for %s', (_label, input) => {
    expect(decodeCursor(input as string | null | undefined)).toBeNull();
  });

  it('refuses a SQL fragment smuggled through the id', () => {
    // The decoded id goes into a query. Returning null means the caller falls back to page
    // one rather than passing the string along.
    const hostile = Buffer.from("2026-09-20T10:00:00Z|' OR 1=1 --").toString('base64url');
    expect(decodeCursor(hostile)).toBeNull();
  });
});
