-- Fix "new row violates row-level security policy" on course thumbnail upload.
-- Run in Supabase → SQL Editor (copy all of this).

drop policy if exists "course reps write thumbnails" on storage.objects;
drop policy if exists "course reps update thumbnails" on storage.objects;
drop policy if exists "course thumbnail insert" on storage.objects;
drop policy if exists "course thumbnail update" on storage.objects;
drop policy if exists "course thumbnail delete" on storage.objects;
drop policy if exists "course thumbnail manage" on storage.objects;
drop policy if exists "course thumbnail own files" on storage.objects;

-- Same pattern as profile-photos (proven in this app): owner must match uploader.
create policy "course thumbnail insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'course-thumbnails'
    and auth.uid() = owner
  );

create policy "course thumbnail update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'course-thumbnails'
    and auth.uid() = owner
  )
  with check (
    bucket_id = 'course-thumbnails'
    and auth.uid() = owner
  );

create policy "course thumbnail delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'course-thumbnails'
    and auth.uid() = owner
  );

notify pgrst, 'reload schema';
