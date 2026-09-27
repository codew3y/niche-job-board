'use client';

import { useId, useRef, useState } from 'react';

import { ImagePlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { controlStyles } from '@/components/ui/field';
import { cn } from '@/lib/ui/cn';
import { resizeImage, storagePath } from '@/lib/upload/resize';

/**
 * Upload an image to the `media` bucket.
 *
 * Direct from the browser, not through a server action. A Server Action body goes through the
 * Next.js server, which on Vercel's Hobby tier means the file must fit a request-body limit
 * and burns function time proportional to its size. The bucket's RLS policies already express
 * exactly who may write where, so routing bytes through our own server adds a bottleneck and
 * no security.
 *
 * ALT TEXT IS COLLECTED BEFORE THE UPLOAD, not after. `item_media.alt_text` is NOT NULL and
 * that is deliberate (§9) — an "add alt text later" flow produces images with no alt text,
 * because nobody comes back. The file is chosen, described, and only then sent.
 */

type Stage = 'idle' | 'describing' | 'uploading' | 'error';

export function ImageUpload({
  onUploaded,
  label = 'Add an image',
}: {
  /** Called once the file is in storage. Writing the database row is the caller's job. */
  onUploaded: (media: { url: string; altText: string; path: string }) => void | Promise<void>;
  label?: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState<{ file: File; preview: string } | null>(null);
  const [altText, setAltText] = useState('');
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);

  const reset = () => {
    if (pending) URL.revokeObjectURL(pending.preview);
    setPending(null);
    setAltText('');
    setStage('idle');
    setProgress(0);
    if (inputRef.current) inputRef.current.value = '';
  };

  async function accept(file: File) {
    setStage('uploading');
    setMessage('Preparing…');
    const resized = await resizeImage(file);
    if (!resized.ok) {
      setMessage(resized.message);
      setStage('error');
      return;
    }
    setPending({ file: resized.file, preview: URL.createObjectURL(resized.file) });
    setStage('describing');
    setMessage('');
  }

  async function upload() {
    if (!pending) return;
    if (altText.trim().length < 3) {
      setMessage('Describe the image for people who cannot see it.');
      return;
    }

    setStage('uploading');
    setMessage('Uploading…');
    setProgress(10);

    /**
     * Imported here rather than at the top of the file.
     *
     * `createBrowserClient` pulls in the whole of supabase-js, including realtime-js — about
     * 1MB of dependency for a feature this product does not use at all. This is the ONLY
     * component that needs a browser client, it lives inside the portfolio editor, and most
     * visitors never open it. A static import would put that weight on every page including
     * /jobs and the homepage.
     *
     * The cost is a fetch at the moment of upload, which is already a network operation and
     * already behind a deliberate click.
     */
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setMessage('Your session expired. Reload and sign in again.');
      setStage('error');
      return;
    }

    const path = storagePath(user.id, pending.file);
    setProgress(35);

    const { error } = await supabase.storage
      .from('media')
      .upload(path, pending.file, { contentType: pending.file.type, upsert: false });

    if (error) {
      // The policy refuses anything outside media/{uid}/, and the bucket refuses the wrong
      // type or size. Both arrive here.
      setMessage(`Upload failed: ${error.message}`);
      setStage('error');
      return;
    }

    setProgress(80);
    const {
      data: { publicUrl },
    } = supabase.storage.from('media').getPublicUrl(path);

    await onUploaded({ url: publicUrl, altText: altText.trim(), path });
    setProgress(100);
    reset();
  }

  return (
    <div className="space-y-3">
      {stage !== 'describing' && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) void accept(file);
          }}
          className={cn(
            'rounded-lg border-2 border-dashed p-6 text-center transition-colors duration-fast ease-out',
            // A ring on the drop zone while its (visually hidden) file input has keyboard focus.
            'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
            dragging ? 'border-accent bg-accent-subtle' : 'border-border-strong',
          )}
        >
          {/*
            A real <input type="file"> with a <label>, not a div with a click handler. The
            label is what makes this keyboard-reachable and what a screen reader announces;
            drag-and-drop is the enhancement on top, not the mechanism.
          */}
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void accept(file);
            }}
          />
          <ImagePlus aria-hidden="true" className="mx-auto mb-2 size-6 text-text-subtle" />
          <label htmlFor={inputId} className="prose-link cursor-pointer text-sm font-medium">
            {label}
          </label>
          <p className="mt-1 text-sm text-text-muted">
            or drop one here — JPEG, PNG, WebP or AVIF, resized automatically
          </p>
        </div>
      )}

      {stage === 'describing' && pending && (
        <div className="space-y-3 rounded-lg border border-border-base p-4">
          <div className="flex gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- a blob: preview of a
                local file, which next/image cannot take and does not need to optimise. */}
            <img
              src={pending.preview}
              alt=""
              className="size-24 shrink-0 rounded-md border border-border-base object-cover"
            />
            <div className="min-w-0 flex-1 space-y-1.5">
              <label htmlFor={`${inputId}-alt`} className="block text-sm font-medium">
                Describe this image <span className="text-danger">*</span>
              </label>
              <textarea
                id={`${inputId}-alt`}
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                rows={2}
                maxLength={300}
                required
                aria-describedby={`${inputId}-alt-hint`}
                placeholder="The checkout screen, showing the saved-card step"
                className={cn(controlStyles, 'border-control/70 px-3 py-2')}
              />
              <p id={`${inputId}-alt-hint`} className="text-xs text-text-muted">
                Required. What someone would miss if the image did not load.
              </p>
            </div>
          </div>

          {message && (
            <p role="alert" className="text-sm text-danger">
              {message}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={reset}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={() => void upload()}>
              Add image
            </Button>
          </div>
        </div>
      )}

      {stage === 'uploading' && (
        <div>
          {/* A real progress element: it announces itself and works without CSS. */}
          <progress
            value={progress}
            max={100}
            className="h-1.5 w-full appearance-none overflow-hidden rounded-full [&::-moz-progress-bar]:bg-accent [&::-webkit-progress-bar]:bg-surface-sunken [&::-webkit-progress-value]:bg-accent"
          >
            {progress}%
          </progress>
          <p aria-live="polite" className="mt-1 text-sm text-text-muted">
            {message}
          </p>
        </div>
      )}

      {stage === 'error' && (
        <p role="alert" className="text-sm text-danger">
          {message}{' '}
          <button type="button" onClick={reset} className="underline">
            Try again
          </button>
        </p>
      )}
    </div>
  );
}
