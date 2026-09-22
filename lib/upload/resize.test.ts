/**
 * Upload path tests.
 *
 * `resizeImage` needs a canvas and `createImageBitmap`, neither of which exists in Node — it
 * is tested in the browser during the E2E pass rather than mocked here, because a mocked
 * canvas would test the mock.
 *
 * `storagePath` is the part that carries a security consequence and is pure, so it is tested
 * properly. Its first path segment IS the authorization rule in `media_insert_own_folder`: if
 * a filename could escape that segment, one user could write into another's folder.
 */

import { describe, expect, it } from 'vitest';

import { storagePath } from './resize';

const USER = '11111111-1111-4111-8111-111111111111';
const file = (name: string) => new File([new Uint8Array([1])], name, { type: 'image/webp' });

describe('storagePath', () => {
  it('puts every object under the user id, which is what the policy checks', () => {
    expect(storagePath(USER, file('shot.webp')).startsWith(`${USER}/`)).toBe(true);
  });

  it('NEVER USES THE SUPPLIED FILENAME — it generates one', () => {
    // The name is attacker-controlled. Generating it makes traversal, collisions and unicode
    // games all irrelevant at once, rather than sanitising each in turn.
    expect(storagePath(USER, file('secret-plans.webp'))).not.toContain('secret-plans');
  });

  it('CANNOT BE ESCAPED BY A TRAVERSAL FILENAME', () => {
    const path = storagePath(USER, file('../../../etc/passwd.png'));
    expect(path).not.toContain('..');
    expect(path).not.toContain('/etc/');
    // Exactly two segments: the uid and one generated name.
    expect(path.split('/')).toHaveLength(2);
  });

  it('strips anything non-alphanumeric from the extension', () => {
    const path = storagePath(USER, file('x.pn g/../y'));
    expect(path.split('/')).toHaveLength(2);
    expect(path).toMatch(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z0-9]+$/);
  });

  it('falls back to webp when there is no usable extension', () => {
    expect(storagePath(USER, file('noextension'))).toMatch(/\.webp$/);
  });

  it('never collides for the same file uploaded twice', () => {
    const a = storagePath(USER, file('shot.webp'));
    const b = storagePath(USER, file('shot.webp'));
    expect(a).not.toBe(b);
  });

  it('keeps two users in separate folders', () => {
    const other = '22222222-2222-4222-8222-222222222222';
    expect(storagePath(USER, file('a.webp')).split('/')[0]).toBe(USER);
    expect(storagePath(other, file('a.webp')).split('/')[0]).toBe(other);
  });
});
