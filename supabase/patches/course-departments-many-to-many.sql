-- Courses ↔ departments many-to-many.
-- A course can belong to more than one department (e.g. shared ACS + INS courses).
-- Run in Supabase → SQL Editor, then wait ~30s (or reload the app).
--
-- After applying, set VITE_COURSES_MULTI_DEPT=true in .env
--
-- IMPORTANT: if you previously applied an older version of this patch that
-- inlined cross-table subqueries in RLS policies, also run
-- supabase/patches/fix-courses-recursion.sql (or re-run the policy section
-- below) to clear "infinite recursion detected in policy for relation courses".

-- Junction table
create table if not exists public.course_departments (
  course_id      uuid not null references public.courses(id) on delete cascade,
  department_id  uuid not null references public.departments(id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (course_id, department_id)
);

create index if not exists course_departments_dept_idx
  on public.course_departments(department_id);

-- Backfill from existing courses.department_id (primary / home department)
insert into public.course_departments (course_id, department_id)
select id, department_id from public.courses
on conflict do nothing;

grant select on public.course_departments to anon, authenticated;
grant insert, update, delete on public.course_departments to authenticated;
grant all on public.course_departments to service_role;

alter table public.course_departments enable row level security;

drop policy if exists "course_departments readable" on public.course_departments;
create policy "course_departments readable" on public.course_departments
  for select using (true);

-- Cross-table checks must go through SECURITY DEFINER helpers so courses and
-- course_departments write policies do not recursively re-trigger each other.
create or replace function public.course_rep_via_linked_department(
  _user_id uuid, _course_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.course_departments cd
    join public.courses c on c.id = cd.course_id
    where cd.course_id = _course_id
      and public.is_course_rep_for(_user_id, cd.department_id, c.level)
  )
$$;

create or replace function public.course_rep_owns_course(
  _user_id uuid, _course_id uuid, _department_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.courses c
    where c.id = _course_id
      and (
        public.is_course_rep_for(_user_id, c.department_id, c.level)
        or public.is_course_rep_for(_user_id, _department_id, c.level)
      )
  )
$$;

drop policy if exists "course_departments write" on public.course_departments;
create policy "course_departments write" on public.course_departments
  for all to authenticated
  using (
    public.has_role(auth.uid(), 'super_admin')
    or public.course_rep_owns_course(auth.uid(), course_id, department_id)
  )
  with check (
    public.has_role(auth.uid(), 'super_admin')
    or public.course_rep_owns_course(auth.uid(), course_id, department_id)
  );

drop policy if exists "courses rep write" on public.courses;
create policy "courses rep write" on public.courses
  for all to authenticated
  using (
    public.has_role(auth.uid(), 'super_admin')
    or public.is_course_rep_for(auth.uid(), department_id, level)
    or public.course_rep_via_linked_department(auth.uid(), id)
  )
  with check (
    public.has_role(auth.uid(), 'super_admin')
    or public.is_course_rep_for(auth.uid(), department_id, level)
    or public.course_rep_via_linked_department(auth.uid(), id)
  );

notify pgrst, 'reload schema';
