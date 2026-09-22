import { IMAGE_TYPES, MAX_IMAGE_BYTES } from '../schemas/upload';

/**
 * Client-side resize, before anything crosses the network.
 *
 * Phones produce 4000px, 8MB photographs. Uploading one to show a 600px-wide screenshot wastes
 * the user's data, the free tier's 1GB, and the time they spend watching a progress bar. The
 * bucket would refuse it at 5MB anyway, and "file too large" after a 30-second upload is the
 * worst possible moment to say so.
 *
 * Re-encoded to WebP: typically 25-35% smaller than JPEG at the same visual quality, supported
 * everywhere that matters, and already on the bucket's MIME allow-list.
 *
 * This is a convenience, NOT a security control. Everything it produces is still checked by
 * `imageUploadInput`, by the bucket's own size and MIME limits, and by the RLS policy on the
 * path. A resize that runs in the browser is a resize an attacker skips.
 */

/** Long edge, in pixels. Enough for a full-width portfolio screenshot on a 2x display. */
const MAX_EDGE = 1600;
const QUALITY = 0.82;

export type ResizeResult =
  { ok: true; file: File; width: number; height: number } | { ok: false; message: string };

export async function resizeImage(file: File): Promise<ResizeResult> {
  if (!IMAGE_TYPES.includes(file.type as (typeof IMAGE_TYPES)[number])) {
    return { ok: false, message: 'Upload a JPEG, PNG, WebP or AVIF image.' };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // A file can carry an image MIME type and not be an image. The decoder is the real test.
    return { ok: false, message: 'That file could not be read as an image.' };
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return { ok: false, message: 'Could not process that image in this browser.' };
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', QUALITY),
  );
  if (!blob) return { ok: false, message: 'Could not process that image.' };

  /**
   * Still too big after resizing means an image that is mostly noise - a photograph of a
   * screen, usually. Refused here with a reason rather than by the bucket with a 413.
   */
  if (blob.size > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      message: 'That image is still over 5 MB after resizing. Try a smaller one.',
    };
  }

  return {
    ok: true,
    file: new File([blob], replaceExtension(file.name, 'webp'), { type: 'image/webp' }),
    width,
    height,
  };
}

function replaceExtension(name: string, ext: string) {
  return `${name.replace(/\.[^.]+$/, '')}.${ext}`;
}

/**
 * The storage path for an upload.
 *
 * The first segment MUST be the user's id - that is the whole of the authorization rule in the
 * `media_insert_own_folder` policy. The filename is a fresh uuid rather than anything derived
 * from what the user called the file: a name is attacker-controlled, and path traversal,
 * collisions and unicode games all stop mattering once the name is generated.
 */
export function storagePath(userId: string, file: File): string {
  return `${userId}/${crypto.randomUUID()}.${extensionOf(file.name)}`;
}

/**
 * The extension, or `webp` when there is not a sensible one.
 *
 * `split('.').pop()` alone returns the WHOLE NAME for a file with no dot, so `noextension`
 * became the extension. Requiring a dot, and capping the length, keeps the result to something
 * that is actually a file extension rather than whatever was typed.
 */
function extensionOf(name: string): string {
  const match = /\.([A-Za-z0-9]{1,8})$/.exec(name);
  return match ? match[1]!.toLowerCase() : 'webp';
}
