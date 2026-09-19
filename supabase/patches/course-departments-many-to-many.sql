-- Courses ↔ departments many-to-many.
-- A course can belong to more than one department (e.g. shared ASI + FIN courses).
-- Run in Supabase → SQL Editor, then wait ~30s (or reload the app).
--
-- After applying, set VITE_COURSES_MULTI_DEPT=true in .env

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

-- Writable by super_admin, or a rep who already covers the course (primary or any link).
-- This lets a rep tag additional departments on a course they manage.
drop policy if exists "course_departments write" on public.course_departments;
create policy "course_departments write" on public.course_departments
  for all to authenticated
  using (
    public.has_role(auth.uid(), 'super_admin')
    or exists (
      select 1 from public.courses c
      where c.id = course_id
        and (
          public.is_course_rep_for(auth.uid(), c.department_id, c.level)
          or public.is_course_rep_for(auth.uid(), department_id, c.level)
        )
    )
  )
  with check (
    public.has_role(auth.uid(), 'super_admin')
    or exists (
      select 1 from public.courses c
      where c.id = course_id
        and (
          public.is_course_rep_for(auth.uid(), c.department_id, c.level)
          or public.is_course_rep_for(auth.uid(), department_id, c.level)
        )
    )
  );

-- Allow reps to manage a course if they cover the primary department OR any linked department
drop policy if exists "courses rep write" on public.courses;
create policy "courses rep write" on public.courses
  for all to authenticated
  using (
    public.has_role(auth.uid(), 'super_admin')
    or public.is_course_rep_for(auth.uid(), department_id, level)
    or exists (
      select 1 from public.course_departments cd
      where cd.course_id = courses.id
        and public.is_course_rep_for(auth.uid(), cd.department_id, courses.level)
    )
  )
  with check (
    public.has_role(auth.uid(), 'super_admin')
    or public.is_course_rep_for(auth.uid(), department_id, level)
    or exists (
      select 1 from public.course_departments cd
      where cd.course_id = courses.id
        and public.is_course_rep_for(auth.uid(), cd.department_id, courses.level)
    )
  );

notify pgrst, 'reload schema';
