'use client';

import { useId, useRef, useState } from 'react';

import { ImageSquare as ImagePlus } from '@phosphor-icons/react/ssr';

import { Button, buttonStyles } from '@/components/ui/button';
import { controlStyles } from '@/components/ui/field';
import { cn } from '@/lib/ui/cn';
import { PROJECT_MEDIA_BUCKET } from '@/lib/schemas/upload';
import { resizeImage, storagePath } from '@/lib/upload/resize';

/**
 * Upload a project photo to the `project-media` bucket (migration 0020).
 *
 * Earlier uploads live in the older `media` bucket; lib/actions/media.ts deletes from whichever
 * bucket a URL names, so both keep working.
 *
 * Direct from the browser, not through a server action. A Server Action body goes through the
 * Next.js server, which on Vercel's Hobby tier means the file must fit a request-body limit
 * and burns function time proportional to its size. The bucket's RLS policies already express
 * exactly who may write where, so routing bytes through our own server adds a bottleneck and
 * no security.
 *
 * ALT TEXT IS COLLECTED BEFORE THE UPLOAD, not after. `item_media.alt_text` is NOT NULL and
 * that is deliberate (§9): an "add alt text later" flow produces images with no alt text,
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
      .from(PROJECT_MEDIA_BUCKET)
      .upload(path, pending.file, { contentType: pending.file.type, upsert: false });

    if (error) {
      // The policy refuses anything outside {bucket}/{uid}/, and the bucket refuses the wrong
      // type or size. Both arrive here.
      setMessage(`Upload failed: ${error.message}`);
      setStage('error');
      return;
    }

    setProgress(80);
    const {
      data: { publicUrl },
    } = supabase.storage.from(PROJECT_MEDIA_BUCKET).getPublicUrl(path);

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
            'rounded-lg border-2 border-dashed p-5 text-center transition-colors duration-fast ease-out sm:p-6',
            // A ring on the drop zone while its (visually hidden) file input has keyboard focus.
            'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
            dragging ? 'border-accent bg-accent-subtle' : 'border-border-strong bg-surface-raised',
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
          <span
            aria-hidden="true"
            className="mx-auto mb-3 grid size-10 place-items-center rounded-md bg-primary-subtle text-primary"
          >
            <ImagePlus size={20} />
          </span>
          {/* Styled as a button, and still the file input's label: that is what makes the zone
              keyboard-reachable and what a screen reader announces. */}
          <label
            htmlFor={inputId}
            className={buttonStyles({
              variant: 'secondary',
              size: 'sm',
              className: 'h-10 cursor-pointer',
            })}
          >
            {label}
          </label>
          <p className="mt-2 text-sm text-text-muted text-pretty">
            Or drop one here. JPEG, PNG, WebP or AVIF, resized automatically.
          </p>
        </div>
      )}

      {stage === 'describing' && pending && (
        <div className="space-y-4 rounded-lg border border-border-base bg-surface-raised p-4">
          {/* Phone: the preview above the description, so the field keeps its full width. */}
          <div className="flex flex-col gap-4 sm:flex-row">
            {/* eslint-disable-next-line @next/next/no-img-element -- a blob: preview of a
                local file, which next/image cannot take and does not need to optimise. */}
            <img
              src={pending.preview}
              alt=""
              className="aspect-video w-full shrink-0 rounded-lg border border-border-base object-cover sm:aspect-square sm:size-24 sm:rounded-md"
            />
            <div className="min-w-0 flex-1 space-y-1.5">
              <label htmlFor={`${inputId}-alt`} className="block text-sm font-semibold text-text">
                Describe this image
              </label>
              <textarea
                id={`${inputId}-alt`}
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                rows={2}
                maxLength={300}
                required
                aria-invalid={Boolean(message)}
                aria-describedby={message ? `${inputId}-alt-error` : `${inputId}-alt-hint`}
                placeholder="The checkout screen, showing the saved-card step"
                className={cn(
                  controlStyles,
                  'min-h-20 px-3.5 py-2.5 leading-relaxed',
                  message ? 'border-danger' : 'border-control hover:border-text-subtle',
                )}
              />
              {/* The error replaces the hint, as in every other field (components/ui/field). */}
              {message ? (
                <p id={`${inputId}-alt-error`} role="alert" className="text-sm text-danger">
                  {message}
                </p>
              ) : (
                <p id={`${inputId}-alt-hint`} className="text-sm text-text-subtle">
                  Required. What someone would miss if the image did not load.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" size="sm" className="h-10" onClick={reset}>
              Cancel
            </Button>
            <Button type="button" size="sm" className="h-10" onClick={() => void upload()}>
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
            aria-label="Upload progress"
            className="h-1.5 w-full appearance-none overflow-hidden rounded-sm [&::-moz-progress-bar]:bg-accent [&::-webkit-progress-bar]:bg-surface-sunken [&::-webkit-progress-value]:bg-accent"
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
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-10 items-center rounded-md font-semibold underline underline-offset-4"
          >
            Try again
          </button>
        </p>
      )}
    </div>
  );
}
