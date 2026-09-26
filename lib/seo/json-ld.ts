/**
 * The ONLY sanctioned way to serialise JSON-LD into a <script> tag.
 *
 * `JSON.stringify` is not safe for this, and the reason is easy to miss: it escapes for JSON,
 * and a <script> block is an HTML context. A string containing `</script>` survives
 * stringification intact, closes the tag early, and everything after it is parsed as HTML.
 *
 *   JSON.stringify({ title: 'Dev </script><img src=x onerror=alert(1)>' })
 *   -> {"title":"Dev </script><img src=x onerror=alert(1)>"}
 *
 * That is stored XSS on a public page, reachable by typing a job title. Every field in these
 * documents is user-controlled - titles, descriptions, headlines, bios.
 *
 * `<` becomes `<`, which JSON parsers decode back to `<`, so the structured data is
 * unchanged and Google reads exactly what it read before. `>` and `&` go too: they cost
 * nothing and close off the variants that rely on a parser being lenient about `<!--`.
 *
 * This is the "sanitize all rich text server-side" requirement from PROJECT.md 5.4. Zod
 * validates shape and React escapes text nodes - neither covers the one place the app
 * deliberately writes raw markup.
 */
export function jsonLdScript(data: unknown): string {
  return (
    JSON.stringify(data)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026')
      // U+2028 and U+2029 are valid inside a JSON string but are line terminators in
      // JavaScript, so an unescaped one is a syntax error inside a script block.
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029')
  );
}
