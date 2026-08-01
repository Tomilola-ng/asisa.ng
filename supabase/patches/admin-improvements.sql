-- Run once in Supabase SQL Editor if your project was created before these changes.

-- 1. Academic session on courses
alter table public.courses
  add column if not exists session_id uuid references public.sessions(id) on delete set null;

-- 2. Fix course thumbnail storage RLS
drop policy if exists "course reps write thumbnails" on storage.objects;
drop policy if exists "course reps update thumbnails" on storage.objects;
drop policy if exists "course thumbnail insert" on storage.objects;
drop policy if exists "course thumbnail update" on storage.objects;
drop policy if exists "course thumbnail delete" on storage.objects;
drop policy if exists "course thumbnail manage" on storage.objects;

create policy "course thumbnail manage" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'course-thumbnails'
    and (
      public.has_role(auth.uid(), 'super_admin')
      or public.has_role(auth.uid(), 'course_rep')
    )
  )
  with check (
    bucket_id = 'course-thumbnails'
    and (
      public.has_role(auth.uid(), 'super_admin')
      or public.has_role(auth.uid(), 'course_rep')
    )
  );

-- 3. Admin delete user RPC
create or replace function public.admin_delete_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.has_role(auth.uid(), 'super_admin') then
    raise exception 'Only super admins can delete users';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'You cannot delete your own account here';
  end if;
  delete from auth.users where id = target_user_id;
end;
$$;

grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_course_rep_for(uuid, uuid, int) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;
