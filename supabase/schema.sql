-- =====================================================================
-- ASISA — Department of Actuarial Science & Insurance, UNILAG
-- Supabase schema + Row Level Security policies
--
-- Run this file in the Supabase SQL editor for your project. It is
-- idempotent-friendly for a fresh project; drop existing tables first
-- if you're re-running against a populated database.
--
-- Design principles:
--  * Roles are stored in a SEPARATE table (`user_roles`). Never on profiles.
--  * All authorization is enforced by RLS, never by hiding buttons.
--  * A course rep can only manage rows within their assigned
--    department / level / class (see policies below).
--  * `public.has_role()` and `public.is_course_rep_for()` are
--    SECURITY DEFINER to avoid recursive policy evaluation.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- ENUMS ----------------------------------------------------
do $$ begin
  create type public.app_role as enum ('super_admin', 'course_rep', 'student');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.feed_scope as enum ('public', 'department', 'class', 'group');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.reaction_kind as enum ('like', 'celebrate', 'insightful');
exception when duplicate_object then null; end $$;

-- ---------- DEPARTMENTS / ACADEMIC STRUCTURE -------------------------
create table if not exists public.departments (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  name        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.sessions (
  id          uuid primary key default gen_random_uuid(),
  label       text unique not null,  -- e.g. '2024/2025'
  is_current  boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Levels (100..500) and semesters (1,2) are enforced with check constraints
-- rather than lookup tables to keep queries simple.

-- ---------- PROFILES -------------------------------------------------
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text not null default '',
  matric_number   text unique,
  email           text,
  department_id   uuid references public.departments(id) on delete set null,
  level           int check (level in (100,200,300,400,500)),
  avatar_url      text,
  bio             text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------- ROLES ----------------------------------------------------
create table if not exists public.user_roles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         public.app_role not null,
  -- For course reps: scope of authority. NULL on super_admin/student.
  department_id uuid references public.departments(id) on delete cascade,
  level         int check (level is null or level in (100,200,300,400,500)),
  created_at   timestamptz not null default now(),
  unique (user_id, role, department_id, level)
);

-- ---------- COURSES --------------------------------------------------
create table if not exists public.courses (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null,
  title              text not null,
  description        text not null default '',
  department_id      uuid not null references public.departments(id) on delete restrict,
  level              int not null check (level in (100,200,300,400,500)),
  semester           int not null check (semester in (1,2)),
  units              int not null default 3 check (units between 1 and 10),
  thumbnail_path     text, -- storage path in 'course-thumbnails'
  drive_folder_url   text, -- Google Drive folder for course files
  past_questions_url text, -- Google Drive folder or file for past questions
  representative_id  uuid references auth.users(id) on delete set null,
  session_id         uuid references public.sessions(id) on delete set null,
  created_by         uuid references auth.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (department_id, code)
);
create index if not exists courses_dept_level_idx on public.courses(department_id, level, semester);

-- A course can belong to multiple departments (shared offerings).
-- courses.department_id remains the primary / home department.
create table if not exists public.course_departments (
  course_id      uuid not null references public.courses(id) on delete cascade,
  department_id  uuid not null references public.departments(id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (course_id, department_id)
);
create index if not exists course_departments_dept_idx
  on public.course_departments(department_id);

-- ---------- GROUPS ---------------------------------------------------
create table if not exists public.groups (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text not null default '',
  image_path   text, -- 'group-images' bucket
  is_private   boolean not null default false,
  owner_id     uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id  uuid not null references public.groups(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- ---------- FEEDS: POSTS / COMMENTS / REACTIONS ----------------------
create table if not exists public.posts (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references auth.users(id) on delete cascade,
  scope         public.feed_scope not null,
  -- scope_id semantics:
  --   public     -> null
  --   department -> departments.id
  --   class      -> departments.id (level lives on the class row via helper)
  --   group      -> groups.id
  scope_id      uuid,
  class_level   int check (class_level is null or class_level in (100,200,300,400,500)),
  session_id    uuid references public.sessions(id) on delete set null,
  body          text not null check (length(body) between 1 and 5000),
  image_url     text,
  created_at    timestamptz not null default now()
);
create index if not exists posts_scope_idx on public.posts(scope, scope_id, class_level);

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  author_id  uuid not null references auth.users(id) on delete cascade,
  body       text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.reactions (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       public.reaction_kind not null default 'like',
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ---------- HELPER FUNCTIONS (SECURITY DEFINER) ----------------------
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- Is this user a course rep with authority over the given (department, level)?
-- level may be null for department-wide reps.
create or replace function public.is_course_rep_for(
  _user_id uuid, _department_id uuid, _level int
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = _user_id
      and r.role = 'course_rep'
      and r.department_id = _department_id
      and (r.level is null or r.level = _level)
  )
$$;

-- Used by the "courses rep write" RLS policy: is this user a rep for
-- any department linked to this course via course_departments? Routed
-- through SECURITY DEFINER to avoid RLS recursion between courses and
-- course_departments (see note on those policies below).
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

-- Used by the "course_departments write" RLS policy: is this user a
-- rep for the course's own department, or for the department being
-- linked? SECURITY DEFINER for the same recursion-avoidance reason.
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

-- Convenience: current user is in the given class (department, level)
create or replace function public.in_class(_department_id uuid, _level int)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.department_id = _department_id
      and p.level = _level
  )
$$;

-- Membership check that bypasses RLS (avoids groups <-> group_members recursion)
create or replace function public.is_group_member(_group_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = _group_id and user_id = _user_id
  )
$$;

-- ---------- TRIGGERS -------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, matric_number, level, department_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'matric_number',''),
    nullif(new.raw_user_meta_data->>'level','')::int,
    (select id from public.departments where code = 'ASI' limit 1)
  );
  insert into public.user_roles (user_id, role) values (new.id, 'student');
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- GRANTS  (required — PostgREST does NOT grant defaults on public schema)
-- =====================================================================
grant usage on schema public to anon, authenticated;

-- Authenticated needs write grants; RLS still gates who can actually write.
grant select, insert, update, delete on public.departments to anon, authenticated;
grant all    on public.departments to service_role;

grant select, insert, update, delete on public.sessions to anon, authenticated;
grant all    on public.sessions to service_role;

grant select, insert, update, delete on public.profiles to authenticated;
grant all                           on public.profiles to service_role;

grant select, insert, update, delete on public.user_roles to authenticated;
grant all                            on public.user_roles to service_role;

grant select on public.courses to anon, authenticated;
grant insert, update, delete on public.courses to authenticated;
grant all    on public.courses to service_role;

grant select on public.course_departments to anon, authenticated;
grant insert, update, delete on public.course_departments to authenticated;
grant all    on public.course_departments to service_role;

grant select, insert, update, delete on public.groups        to authenticated;
grant all                            on public.groups        to service_role;
grant select, insert, delete         on public.group_members to authenticated;
grant all                            on public.group_members to service_role;

grant select, insert, update, delete on public.posts     to authenticated;
grant all                            on public.posts     to service_role;
grant select, insert, update, delete on public.comments  to authenticated;
grant all                            on public.comments  to service_role;
grant select, insert, delete         on public.reactions to authenticated;
grant all                            on public.reactions to service_role;

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.departments   enable row level security;
alter table public.sessions      enable row level security;
alter table public.profiles      enable row level security;
alter table public.user_roles    enable row level security;
alter table public.courses       enable row level security;
alter table public.course_departments enable row level security;
alter table public.groups        enable row level security;
alter table public.group_members enable row level security;
alter table public.posts         enable row level security;
alter table public.comments      enable row level security;
alter table public.reactions     enable row level security;

-- Departments / sessions: everyone can read, only super_admin writes.
create policy "departments readable" on public.departments
  for select using (true);
create policy "departments admin write" on public.departments
  for all to authenticated
  using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

create policy "sessions readable" on public.sessions
  for select using (true);
create policy "sessions admin write" on public.sessions
  for all to authenticated
  using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

-- Profiles: own profile is fully self-managed. Others viewable to signed-in.
create policy "profiles self read" on public.profiles
  for select to authenticated using (true);
create policy "profiles self update" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
create policy "profiles admin all" on public.profiles
  for all to authenticated
  using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

-- User roles: readable by the user themselves and by admins. Only
-- super_admin writes. (Never let users self-assign a role!)
create policy "roles self read" on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'super_admin'));
create policy "roles admin write" on public.user_roles
  for all to authenticated
  using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

-- Courses: publicly readable; writable by super_admin OR the scoped rep
-- (primary department or any linked department via course_departments).
--
-- NOTE: the rep-write checks below delegate to SECURITY DEFINER helper
-- functions (course_rep_via_linked_department / course_rep_owns_course)
-- rather than inlining a raw subquery on the other RLS-protected table.
-- courses and course_departments each reference the other's rows in
-- their write policy; a plain `exists (select ... from other_table)`
-- would re-trigger that table's RLS policy, which re-triggers this one,
-- causing "infinite recursion detected in policy for relation courses".
-- Routing through a SECURITY DEFINER function bypasses RLS for that
-- lookup and breaks the cycle.
create policy "courses readable" on public.courses
  for select using (true);
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

create policy "course_departments readable" on public.course_departments
  for select using (true);
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

-- Groups: any authenticated user can list; private groups only readable
-- by members. Owner (or super_admin) can update/delete.
create policy "groups readable" on public.groups
  for select to authenticated
  using (
    not is_private
    or owner_id = auth.uid()
    or public.is_group_member(id, auth.uid())
    or public.has_role(auth.uid(), 'super_admin')
  );
create policy "groups insert own" on public.groups
  for insert to authenticated
  with check (owner_id = auth.uid());
create policy "groups owner modify" on public.groups
  for update to authenticated
  using (owner_id = auth.uid() or public.has_role(auth.uid(), 'super_admin'))
  with check (owner_id = auth.uid() or public.has_role(auth.uid(), 'super_admin'));
create policy "groups owner delete" on public.groups
  for delete to authenticated
  using (owner_id = auth.uid() or public.has_role(auth.uid(), 'super_admin'));

create policy "group_members readable" on public.group_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.has_role(auth.uid(), 'super_admin')
    or exists (
      select 1 from public.groups g
      where g.id = group_id
        and (g.owner_id = auth.uid() or not g.is_private)
    )
    or public.is_group_member(group_id, auth.uid())
  );
create policy "group_members self join" on public.group_members
  for insert to authenticated with check (user_id = auth.uid());
create policy "group_members self leave" on public.group_members
  for delete to authenticated
  using (user_id = auth.uid()
         or exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid()));

-- Posts: visibility per scope.
create policy "posts read" on public.posts
  for select to authenticated
  using (
    scope = 'public'
    or (scope = 'department' and exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.department_id = posts.scope_id))
    or (scope = 'class' and public.in_class(posts.scope_id, posts.class_level))
    or (scope = 'group' and public.is_group_member(posts.scope_id, auth.uid()))
    or public.has_role(auth.uid(), 'super_admin')
  );
create policy "posts insert own" on public.posts
  for insert to authenticated
  with check (
    author_id = auth.uid() and (
      scope = 'public'
      or (scope = 'department' and exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.department_id = posts.scope_id))
      or (scope = 'class' and public.in_class(posts.scope_id, posts.class_level))
      or (scope = 'group' and public.is_group_member(posts.scope_id, auth.uid()))
    )
  );
create policy "posts author update" on public.posts
  for update to authenticated
  using (author_id = auth.uid() or public.has_role(auth.uid(),'super_admin'))
  with check (author_id = auth.uid() or public.has_role(auth.uid(),'super_admin'));
create policy "posts author delete" on public.posts
  for delete to authenticated
  using (author_id = auth.uid() or public.has_role(auth.uid(),'super_admin'));

-- Comments follow the parent post's visibility.
create policy "comments read" on public.comments
  for select to authenticated
  using (exists (select 1 from public.posts p where p.id = comments.post_id));
create policy "comments insert own" on public.comments
  for insert to authenticated with check (author_id = auth.uid());
create policy "comments author modify" on public.comments
  for update to authenticated
  using (author_id = auth.uid() or public.has_role(auth.uid(),'super_admin'))
  with check (author_id = auth.uid() or public.has_role(auth.uid(),'super_admin'));
create policy "comments author delete" on public.comments
  for delete to authenticated
  using (author_id = auth.uid() or public.has_role(auth.uid(),'super_admin'));

-- Reactions: users toggle their own.
create policy "reactions read" on public.reactions
  for select to authenticated using (true);
create policy "reactions insert own" on public.reactions
  for insert to authenticated with check (user_id = auth.uid());
create policy "reactions delete own" on public.reactions
  for delete to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'super_admin'));

-- =====================================================================
-- STORAGE  (course thumbnails, profile photos, group images)
--
-- Create these buckets via the Supabase dashboard (or SQL below) then
-- attach the policies. Buckets are public-read so images can render in
-- the app without signed URLs. Writes are still authorization-checked.
-- =====================================================================
insert into storage.buckets (id, name, public) values
  ('course-thumbnails','course-thumbnails', true),
  ('profile-photos'   ,'profile-photos',    true),
  ('group-images'     ,'group-images',      true)
on conflict (id) do nothing;

-- Storage policies (storage.objects)
-- Public buckets serve files via public URLs; avoid broad SELECT policies that
-- allow listing every object in the bucket.
-- Thumbnails: same owner-based pattern as profile-photos (uploader owns the object).
drop policy if exists "course reps write thumbnails" on storage.objects;
drop policy if exists "course reps update thumbnails" on storage.objects;
drop policy if exists "course thumbnail insert" on storage.objects;
drop policy if exists "course thumbnail update" on storage.objects;
drop policy if exists "course thumbnail delete" on storage.objects;
drop policy if exists "course thumbnail manage" on storage.objects;
drop policy if exists "course thumbnail own files" on storage.objects;

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

create policy "users manage own profile photo" on storage.objects
  for all to authenticated
  using (bucket_id = 'profile-photos' and owner = auth.uid())
  with check (bucket_id = 'profile-photos' and owner = auth.uid());

create policy "authenticated write group images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'group-images');
create policy "owner update group image" on storage.objects
  for update to authenticated
  using (bucket_id = 'group-images' and owner = auth.uid());

-- Super admin: delete a user account (auth.users cascade removes profile, roles, etc.)
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

-- Helper functions: not callable via PostgREST by anon
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.in_class(uuid, int) from public, anon;
revoke execute on function public.is_course_rep_for(uuid, uuid, int) from public, anon;
revoke all on function public.is_group_member(uuid, uuid) from public;
grant execute on function public.is_group_member(uuid, uuid) to authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_course_rep_for(uuid, uuid, int) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- =====================================================================
-- SEED (idempotent)
-- =====================================================================
insert into public.departments (code, name)
values
  ('ASI', 'Actuarial Science & Insurance'),
  ('FIN', 'Finance'),
  ('ACC', 'Accounting')
on conflict (code) do nothing;

insert into public.sessions (label, is_current)
values
  ('2023/2024', false),
  ('2024/2025', false),
  ('2025/2026', true)
on conflict (label) do nothing;

insert into public.courses (code, title, description, department_id, level, semester, units, drive_folder_url)
select
  v.code, v.title, v.description, d.id, v.level, v.semester, v.units, v.drive_folder_url
from public.departments d
cross join (
  values
    ('ACT 301', 'Life Contingencies I',
     'Introduction to life tables, survival models, and single-life annuities and assurances.',
     300, 1, 3, 'https://drive.google.com/drive/folders/example'),
    ('ACT 302', 'Risk Theory',
     'Individual and collective risk models, ruin theory, and premium calculation principles.',
     300, 2, 3, null),
    ('INS 401', 'Reinsurance',
     'Structures of proportional and non-proportional reinsurance and their financial impact.',
     400, 1, 2, null),
    ('ACT 205', 'Financial Mathematics',
     'Interest theory, annuities-certain, and loan schedules.',
     200, 1, 3, null)
) as v(code, title, description, level, semester, units, drive_folder_url)
where d.code = 'ASI'
on conflict (department_id, code) do nothing;

insert into public.course_departments (course_id, department_id)
select c.id, c.department_id from public.courses c
on conflict do nothing;

-- =====================================================================
-- END
-- =====================================================================
