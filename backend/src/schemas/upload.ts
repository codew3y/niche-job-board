import { z } from 'zod';

/**
 * Upload validation (§5.4). Checked BEFORE anything reaches Storage.
 *
 * MIME type is taken from the allow-list, not from the extension and not from the
 * client-supplied `type` alone — both are trivially spoofed. The server re-checks the magic
 * bytes; this schema is the cheap first gate.
 */
/** Where project photos go. `media` (migration 0011) still holds photos uploaded before 0020. */
export const PROJECT_MEDIA_BUCKET = 'project-media';
export const STORAGE_BUCKETS = [PROJECT_MEDIA_BUCKET, 'media'] as const;

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const imageUploadInput = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.enum(IMAGE_TYPES, {
    message: 'Upload a JPEG, PNG, WebP or AVIF image.',
  }),
  sizeBytes: z.coerce
    .number()
    .int()
    .positive()
    .max(MAX_IMAGE_BYTES, 'Images must be 5 MB or smaller.'),
  width: z.coerce.number().int().positive().max(10000).optional(),
  height: z.coerce.number().int().positive().max(10000).optional(),
  altText: z.string().trim().min(3, 'Describe the image.').max(300),
});

export type ImageUploadInput = z.infer<typeof imageUploadInput>;
