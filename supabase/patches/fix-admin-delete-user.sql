-- Enable super-admin user deletion from the Admin UI.
-- Run once in Supabase → SQL Editor → Run.
--
-- Fixes:
-- 1. Creates public.admin_delete_user (missing on many existing projects).
-- 2. Cleans quizzes created by the user before deleting auth.users, because
--    quizzes.created_by → profiles has no ON DELETE CASCADE and would block
--    the delete with a foreign-key error.

-- Soften quizzes FK so profile/user deletion isn't blocked forever.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'quizzes'
  ) then
    alter table public.quizzes
      drop constraint if exists quizzes_created_by_fkey;
    alter table public.quizzes
      add constraint quizzes_created_by_fkey
      foreign key (created_by) references public.profiles(id) on delete cascade;
  end if;
end $$;

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
  if not exists (select 1 from auth.users where id = target_user_id) then
    raise exception 'User not found';
  end if;

  -- Defensive cleanup for tables that may not cascade from auth.users
  if to_regclass('public.quiz_questions') is not null
     and to_regclass('public.quizzes') is not null then
    delete from public.quiz_questions
    where quiz_id in (
      select id from public.quizzes where created_by = target_user_id
    );
    delete from public.quizzes where created_by = target_user_id;
  end if;

  delete from auth.users where id = target_user_id;
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;

notify pgrst, 'reload schema';
