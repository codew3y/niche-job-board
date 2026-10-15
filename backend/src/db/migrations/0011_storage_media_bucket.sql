-- The Storage bucket for uploaded images, created in SQL rather than by hand in the dashboard.
--
-- storage.buckets is an ordinary table, so the bucket, its size cap, its MIME allow-list and
-- its policies all belong in version control with everything else. A bucket configured by
-- clicking exists only in whichever project someone clicked in — it cannot be recreated on a
-- fresh database, and nothing tests it.
--
-- PUBLIC READ, deliberately. These images are portfolio work rendered on public profile
-- pages; a private bucket would mean minting a signed URL for every image on every render,
-- which expires, breaks CDN caching and gains nothing once the profile is published.
--
-- The honest cost: an image attached to an UNPUBLISHED profile is still fetchable by anyone
-- who has its URL. Paths are uuid-based and unguessable, but unguessable is not private. That
-- is acceptable for portfolio images, which exist to be shown, and it is NOT acceptable for
-- anything else — so nothing else goes in this bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  5242880,  -- 5 MB, the same cap as MAX_IMAGE_BYTES in lib/schemas/upload.ts
  -- Mirrors IMAGE_TYPES. SVG is excluded on purpose: it can carry script, and it would be
  -- served from our own origin.
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;--> statement-breakpoint

-- Every object lives under the uploader's own user id: media/{auth.uid()}/{...}. That first
-- path segment IS the authorization check — it is what makes "your own files" expressible as
-- a policy rather than as a hope about how the application builds paths.
--
-- The server must therefore never build a path from client-supplied text. It builds
-- `${user.id}/${crypto.randomUUID()}.${ext}`; the policy then refuses anything else.

drop policy if exists "media_public_read" on storage.objects;--> statement-breakpoint
create policy "media_public_read" on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'media');--> statement-breakpoint

drop policy if exists "media_insert_own_folder" on storage.objects;--> statement-breakpoint
create policy "media_insert_own_folder" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );--> statement-breakpoint

drop policy if exists "media_update_own_folder" on storage.objects;--> statement-breakpoint
create policy "media_update_own_folder" on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );--> statement-breakpoint

-- Delete is scoped the same way. Without it, anyone authenticated could delete anyone's
-- portfolio images — a destructive operation reachable from a browser console.
drop policy if exists "media_delete_own_folder" on storage.objects;--> statement-breakpoint
create policy "media_delete_own_folder" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
