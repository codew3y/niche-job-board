'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { itemMediaInput } from '../schemas/talent';
import { STORAGE_BUCKETS } from '../schemas/upload';
import { createClient } from '../supabase/server';

/**
 * Attaching and detaching images on a portfolio item.
 *
 * The bytes go straight from the browser to Storage (see components/upload/image-upload.tsx);
 * these actions only write the `item_media` rows that point at them. Ownership is enforced by
 * the `media_write_own` policy, which walks item -> talent_profile -> user_id, so nothing here
 * needs to re-check it — and a check here would not help anyway, since the policy is what a
 * crafted request has to get past.
 */

export async function attachMedia(formData: FormData): Promise<void> {
  const itemId = String(formData.get('itemId') ?? '');
  const parsed = itemMediaInput.safeParse({
    url: formData.get('url'),
    altText: formData.get('altText'),
    sortOrder: formData.get('sortOrder') ?? 0,
  });
  // Alt text is NOT NULL in the schema and validated here too. An image without it is not
  // saved at all rather than saved with a placeholder nobody ever replaces.
  if (!itemId || !parsed.success) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await supabase.from('item_media').insert({
    item_id: itemId,
    url: parsed.data.url,
    alt_text: parsed.data.altText,
    sort_order: parsed.data.sortOrder,
  });

  revalidatePath('/dashboard/talent/profile');
}

export async function detachMedia(formData: FormData): Promise<void> {
  const mediaId = String(formData.get('mediaId') ?? '');
  if (!mediaId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: media } = await supabase
    .from('item_media')
    .select('url')
    .eq('id', mediaId)
    .maybeSingle();

  const { error } = await supabase.from('item_media').delete().eq('id', mediaId);
  if (error) return;

  /**
   * Remove the object too, so deleting an image actually frees the 1GB it counts against.
   * Row first, object second: an orphaned object wastes space, whereas a row pointing at a
   * deleted object renders a broken image on a public profile. If this half fails the image
   * is already gone from the page, which is the outcome the user asked for.
   */
  if (media?.url) {
    const object = storageObjectFromPublicUrl(media.url);
    if (object) await supabase.storage.from(object.bucket).remove([object.path]);
  }

  revalidatePath('/dashboard/talent/profile');
}

/**
 * Recover the bucket and object path from a public URL.
 *
 * Supabase public URLs look like `.../storage/v1/object/public/<bucket>/<uid>/<file>`. Only our
 * own buckets are recognised (`project-media`, and `media` for photos uploaded before migration
 * 0020); anything else returns null, so an externally hosted cover image — which is still
 * allowed — is never mistaken for one of ours and passed to storage.remove().
 */
function storageObjectFromPublicUrl(url: string): { bucket: string; path: string } | null {
  for (const bucket of STORAGE_BUCKETS) {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const at = url.indexOf(marker);
    if (at === -1) continue;
    const path = url.slice(at + marker.length);
    return path.length > 0 ? { bucket, path: decodeURIComponent(path) } : null;
  }
  return null;
}
