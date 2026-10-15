/**
 * JSON-LD serialisation.
 *
 * This is the one place the application deliberately writes raw markup into the page, and
 * every field in those documents is user-controlled: job titles, descriptions, headlines,
 * bios. `JSON.stringify` escapes for JSON, and a `<script>` block is an HTML context — a
 * title containing `</script>` closes the tag early and everything after it parses as HTML.
 *
 * That was live on /jobs/[slug] and /talent/[slug]. These tests are the guard.
 */

import { describe, expect, it } from 'vitest';

import { jsonLdScript } from './json-ld';

describe('jsonLdScript', () => {
  it('NEUTRALISES A CLOSING SCRIPT TAG — the stored XSS this replaces', () => {
    const out = jsonLdScript({ title: 'Senior dev </script><img src=x onerror=alert(1)>' });
    expect(out).not.toContain('</script>');
    expect(out).not.toContain('<img');
    expect(out).toContain('\\u003c');
  });

  it('escapes < > and & wherever they appear, not just in a tag', () => {
    const out = jsonLdScript({ a: '<', b: '>', c: '&' });
    expect(out).not.toMatch(/[<>&]/);
  });

  it('PRESERVES MEANING — Google must read exactly what it read before', () => {
    // The escapes are JSON unicode escapes, so a parser decodes them back. If this ever
    // failed, the fix would have silently broken every structured-data listing.
    const data = {
      '@type': 'JobPosting',
      title: 'Dev </script> & "quotes" <tags>',
      description: 'Line one\nline two',
    };
    expect(JSON.parse(jsonLdScript(data))).toEqual(data);
  });

  it('escapes U+2028 and U+2029, which are legal in JSON and fatal in a script block', () => {
    // A raw line separator inside a script tag is a JavaScript syntax error, so the whole
    // block fails to parse and the structured data disappears silently.
    const out = jsonLdScript({ bio: `before\u2028after\u2029end` });
    expect(out).not.toMatch(/[\u2028\u2029]/);
    expect(JSON.parse(out).bio).toBe('before\u2028after\u2029end');
  });

  it('handles the empty document the closed-job path emits', () => {
    expect(jsonLdScript({})).toBe('{}');
  });

  it('handles nested user content, since sameAs and knowsAbout are arrays of user strings', () => {
    const out = jsonLdScript({ sameAs: ['https://x.test/</script>'], knowsAbout: ['<b>'] });
    expect(out).not.toContain('</script>');
    expect(out).not.toContain('<b>');
  });
});

describe('no page bypasses it', () => {
  it('NEITHER JSON-LD PAGE CALLS JSON.stringify DIRECTLY', async () => {
    // The helper only helps if it is the only path. A future page that reaches for
    // JSON.stringify reintroduces the hole, and this is what notices.
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    // Paths anchored to the repository root, whatever the working directory.
    const REPO = join(import.meta.dirname, '..', '..', '..');
    for (const file of [
      'frontend/app/(marketing)/jobs/[slug]/page.tsx',
      'frontend/app/(marketing)/talent/[slug]/page.tsx',
    ]) {
      const source = readFileSync(join(REPO, file), 'utf8');
      const block = source.slice(source.indexOf('dangerouslySetInnerHTML'));
      expect(block.slice(0, 200), `${file} stringifies into a script tag`).not.toContain(
        'JSON.stringify',
      );
    }
  });
});
