-- Fix: "infinite recursion detected in policy for relation courses"
--
-- Root cause: the "courses rep write" policy contains a raw subquery on
-- public.course_departments, and the "course_departments write" policy
-- contains a raw subquery on public.courses. Both tables have RLS
-- enabled, so each subquery re-triggers the other table's policy,
-- which re-triggers the first, and so on -- Postgres detects the cycle
-- and aborts with "infinite recursion detected in policy for relation
-- \"courses\"".
--
-- Fix: move the cross-table existence checks into SECURITY DEFINER
-- helper functions (same pattern as has_role/is_course_rep_for), which
-- bypass RLS internally and break the recursive chain.

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
