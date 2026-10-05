import { NextResponse } from 'next/server';

import { buildDataExport } from '@/lib/services/data-export';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /dashboard/settings/account/export: download your data as JSON.
 *
 * Signed in only (the route policy already sends signed-out visitors to the login; this checks
 * again, as every handler should). Built with the caller's own session, so RLS limits it to what
 * they can already see (lib/services/data-export.ts). Never cached: it is personal and current.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

  let data: Awaited<ReturnType<typeof buildDataExport>>;
  try {
    data = await buildDataExport(supabase, user);
  } catch (cause) {
    console.error(String(cause).slice(0, 300));
    return NextResponse.json(
      { error: 'Could not build your export just now. Try again in a minute.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="techselect-data-${day}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
