import type { NextConfig } from 'next';

/**
 * Where images are allowed to come from.
 *
 * Portfolio screenshots live in Supabase Storage, and until now they were rendered with a raw
 * `<img>` — three `@next/next/no-img-element` suppressions whose stated reason was that
 * Storage "is not a configured next/image loader domain". That is a config file, not a law.
 * Those images are the heaviest thing on a public talent profile, which is one of the two
 * pages the Lighthouse performance budget is measured on, so they were the worst possible
 * place to skip resizing and modern formats.
 *
 * The host is derived from NEXT_PUBLIC_SUPABASE_URL rather than hardcoded, so local
 * (127.0.0.1:54321) and production (the project's own subdomain) both work from one line and
 * neither can drift. `/storage/v1/object/public/**` is deliberately narrow: only the public
 * bucket path, never the authenticated or signed-URL endpoints.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL is required at build time to allow-list image hosts. ' +
      'Without it every portfolio image 400s, which is a worse failure than this one.',
  );
}
const { protocol, hostname, port } = new URL(supabaseUrl);

/**
 * Next 16 refuses to optimise an upstream that resolves to a private IP — an SSRF guard, and
 * a good one. Local Supabase is 127.0.0.1, so without this every portfolio image is broken in
 * development and fine in production, which is the worst way round to find out.
 *
 * Scoped to the loopback and RFC1918 ranges, so it can only ever be on when the configured
 * Supabase really is a local one. A hosted project never matches, and the guard stays up.
 */
const isLocalSupabase =
  /^(127\.|0\.0\.0\.0$|localhost$|::1$|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname);

const nextConfig: NextConfig = {
  /**
   * The two browse indexes became one page with a type filter (/browse). Old links, bookmarks
   * and search results keep working; the query string is passed through, so a filtered /jobs
   * link lands on the same filtered list. Only the exact index paths — /jobs/<slug> and
   * /talent/<slug> are the public detail pages and are untouched.
   *
   * Not permanent (307): browse is sign-in-only now, and a permanent redirect would be cached by
   * browsers against a decision that may still change.
   */
  async redirects() {
    return [
      { source: '/jobs', destination: '/browse?type=jobs', permanent: false },
      { source: '/talent', destination: '/browse?type=developers', permanent: false },
    ];
  },
  experimental: {
    serverActions: {
      // Resume import uploads a PDF through a server action (lib/actions/resume-import.ts).
      // The default 1 MB is too small for a resume; 4 MB stays under Vercel's 4.5 MB request
      // limit, and lib/import/extract.ts refuses anything over 3 MB with a clear message.
      bodySizeLimit: '4mb',
    },
  },
  images: {
    // AVIF first, WebP for everything that cannot take it. Both are roughly half the bytes of
    // the JPEG/PNG originals at the same quality.
    formats: ['image/avif', 'image/webp'],
    dangerouslyAllowLocalIP: isLocalSupabase,
    remotePatterns: [
      {
        protocol: protocol.replace(':', '') as 'http' | 'https',
        hostname,
        port: port || undefined,
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
