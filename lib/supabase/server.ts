import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient as createRawClient } from '@supabase/supabase-js';

import { clientEnv, serverEnv } from '../env';

/**
 * Server client for Server Components, Server Actions and Route Handlers.
 *
 * Uses the ANON key and the caller's session cookie, so `auth.uid()` is populated and RLS
 * applies exactly as it does in the browser. That is the point: authorization lives in the
 * database (ADR-001), and the server should not quietly get more access than the user has.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component, where cookies are read-only. Safe to ignore:
            // the middleware refreshes the session on every request, so the write is not lost.
          }
        },
      },
    },
  );
}

/**
 * SERVICE-ROLE CLIENT — BYPASSES ALL RLS.
 *
 * Every policy in lib/db/schema/* is inert for this client. It exists for the few operations
 * that genuinely cannot be done as the user:
 *   - serving /api/match/* from `match_cache`, which has no `authenticated` policy at all so
 *     that the ADR-007 D2 score asymmetry cannot be bypassed
 *   - writing notifications on someone else's behalf
 *   - resolving reports
 *
 * Anything else should use `createClient()`. Reaching for this to "make a query work" is
 * almost always a sign that a policy is wrong, and swapping the client hides the bug instead
 * of fixing it.
 */
/**
 * Cached for the life of the function instance.
 *
 * It used to be built fresh on every call, which measured 7003ms per query in production
 * against the same table the anon client read in 536ms. Consistently ~7000ms, which is a
 * connection-level stall rather than query time — a new client means a new fetch connection,
 * and nothing was reusing one.
 *
 * Safe to share: unlike the SSR client, this one holds no per-request state. It has no
 * session, no cookies and `persistSession: false`, so there is nothing belonging to one
 * request that could leak into another. That property is exactly what makes caching an
 * anon/SSR client wrong and this one right.
 */
function buildServiceClient() {
  const { SUPABASE_SERVICE_ROLE_KEY } = serverEnv();
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set, so the service-role client cannot be created. ' +
        'Add it from Dashboard → Settings → API. It must never be a NEXT_PUBLIC_ variable.',
    );
  }
  return createRawClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Typed from the builder rather than from createRawClient directly: the bare ReturnType of
// the generic factory loses the schema types and every caller degrades to `never`.
let cachedServiceClient: ReturnType<typeof buildServiceClient> | null = null;

export function createServiceClient() {
  cachedServiceClient ??= buildServiceClient();
  return cachedServiceClient;
}
