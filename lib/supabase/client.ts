'use client';

import { createBrowserClient } from '@supabase/ssr';

import { clientEnv } from '../env';

/**
 * Browser client. Uses the anon key and is therefore subject to RLS — every query it makes is
 * filtered by the policies in lib/db/schema/*.
 *
 * This is the only Supabase client that may touch the browser.
 */
export function createClient() {
  return createBrowserClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
