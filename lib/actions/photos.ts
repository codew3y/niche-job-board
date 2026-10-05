'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { clientEnv } from '../env';
import { createClient } from '../supabase/server';

/**
 * Profile photo (developers) and company logo (clients).
 *
 * The browser uploads the resized image straight to the `media` bucket under the person's own
 * folder (storage policy, migration 0011), then calls one of these with its public URL. The URL
 * is checked to be in THAT person's folder of OUR storage before it is saved (and the database
 * checks the folder again, migration 0025), so a profile can never be pointed at someone else's
 * upload or at an outside image. Replacing or removing deletes the previous file.
 */

type Kind = 'photo' | 'logo';
const TABLE = { photo: 'talent_profiles', logo: 'client_profiles' } as const;
const COLUMN = { photo: 'avatar_url', logo: 'logo_url' } as const;

const ownPrefix = (userId: string) =>
  `${clientEnv.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/public/media/${userId}/`;

async function current(kind: Kind) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: row } = await supabase
    .from(TABLE[kind])
    .select(`id, ${COLUMN[kind]}`)
    .eq('user_id', user.id)
    .maybeSingle<{ id: string } & Record<string, string | null>>();
  return { supabase, user, row };
}

async function removeOld(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  url: string | null | undefined,
) {
  if (!url?.startsWith(ownPrefix(userId))) return;
  const path = decodeURIComponent(url.slice(url.indexOf('/media/') + '/media/'.length));
  await supabase.storage.from('media').remove([path]);
}

function revalidate(kind: Kind) {
  if (kind === 'photo') {
    revalidatePath('/dashboard/talent/profile');
    revalidatePath('/talent/[slug]', 'page');
  } else {
    revalidatePath('/dashboard/client/profile');
    revalidatePath('/company/[id]', 'page');
    revalidatePath('/jobs/[slug]', 'page');
  }
  revalidatePath('/browse');
  revalidatePath('/dashboard', 'layout');
}

export async function setImage(
  kind: Kind,
  url: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { supabase, user, row } = await current(kind);
  if (!row) return { ok: false, message: 'Set up your profile first.' };
  if (!url.startsWith(ownPrefix(user.id)) || /[\s"'<>]/.test(url)) {
    return { ok: false, message: 'That image did not come from your upload. Try again.' };
  }
  const previous = row[COLUMN[kind]];
  const { error } = await supabase
    .from(TABLE[kind])
    .update({ [COLUMN[kind]]: url })
    .eq('id', row.id);
  if (error) return { ok: false, message: 'Could not save that image. Try again.' };
  if (previous && previous !== url) await removeOld(supabase, user.id, previous);
  revalidate(kind);
  return { ok: true };
}

export async function removeImage(kind: Kind): Promise<void> {
  const { supabase, user, row } = await current(kind);
  if (!row) return;
  const previous = row[COLUMN[kind]];
  await supabase
    .from(TABLE[kind])
    .update({ [COLUMN[kind]]: null })
    .eq('id', row.id);
  await removeOld(supabase, user.id, previous);
  revalidate(kind);
}
