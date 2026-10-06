'use client';

import { Camera, Trash } from '@phosphor-icons/react/ssr';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/field';
import { removeImage, setImage } from '@/lib/actions/photos';
import { createClient } from '@/lib/supabase/client';
import { resizeImage, storagePath } from '@/lib/upload/resize';

/**
 * Upload or remove a profile photo (developers) or company logo (clients).
 *
 * The image is resized in the browser, uploaded straight to the `media` bucket under the
 * person's own folder (storage policy, migration 0011), then saved through setImage, which
 * checks it came from that folder (lib/actions/photos.ts). One control, not a form: it is used
 * inside the profile and company forms and must not nest a <form>.
 */
export function PhotoUpload({
  kind,
  name,
  current,
}: {
  kind: 'photo' | 'logo';
  /** The person's headline or the company name: the fallback initials and the alt context. */
  name: string;
  current: string | null;
}) {
  const id = useId();
  const router = useRouter();
  const [preview, setPreview] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const label = kind === 'photo' ? 'Profile photo' : 'Photo or logo';

  const upload = async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      const resized = await resizeImage(file);
      if (!resized.ok) return setError(resized.message);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return setError('Sign in again, then try once more.');
      const path = storagePath(user.id, resized.file);
      const { error: upErr } = await supabase.storage
        .from('media')
        .upload(path, resized.file, { contentType: resized.file.type, upsert: false });
      if (upErr) return setError(`Upload failed: ${upErr.message}`);
      const url = supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
      const saved = await setImage(kind, url);
      if (!saved.ok) return setError(saved.message);
      setPreview(url);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <p id={`${id}-label`} className="text-sm font-semibold">
        {label}
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={name} src={preview} size="lg" />
        <div className="flex flex-wrap gap-2">
          <label
            htmlFor={id}
            className="pressable inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-control bg-surface-raised px-3.5 text-sm font-semibold text-text shadow-xs hover:bg-surface-sunken has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus"
          >
            <Camera aria-hidden="true" size={16} />
            {busy ? 'Uploading…' : preview ? 'Change' : 'Upload'}
            <input
              id={id}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="sr-only"
              aria-describedby={`${id}-hint`}
              disabled={busy || pending}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void upload(file);
              }}
            />
          </label>
          {preview && (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy || pending}
              onClick={() =>
                startTransition(async () => {
                  await removeImage(kind);
                  setPreview(null);
                  router.refresh();
                })
              }
            >
              <Trash aria-hidden="true" />
              Remove
            </Button>
          )}
        </div>
      </div>
      <p id={`${id}-hint`} className="text-sm text-text-subtle">
        {kind === 'photo'
          ? 'A clear photo of your face, or leave it to your initials. JPEG, PNG, WebP or AVIF.'
          : 'Square works best. JPEG, PNG, WebP or AVIF.'}
      </p>
      {error && <FormError>{error}</FormError>}
    </div>
  );
}
