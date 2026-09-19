-- =====================================================================
-- ASISA — level images (one shared image per level) + quiz feature
-- Run once in the Supabase SQL editor after supabase/schema.sql.
-- =====================================================================

-- ---------- LEVEL IMAGES ---------------------------------------------
-- A single reusable image per level (100/200/300/400/500) instead of a
-- thumbnail stored per-course, so the same picture isn't duplicated in
-- storage/db for every course at that level.
create table if not exists public.level_images (
  level       integer primary key,
  image_path  text not null,
  updated_at  timestamptz not null default now()
);

alter table public.level_images enable row level security;

drop policy if exists "level_images_select_all" on public.level_images;
create policy "level_images_select_all" on public.level_images
  for select using (true);

drop policy if exists "level_images_write_admin_rep" on public.level_images;
create policy "level_images_write_admin_rep" on public.level_images
  for all using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role in ('super_admin', 'course_rep')
    )
  );

insert into storage.buckets (id, name, public)
  values ('level-images', 'level-images', true)
  on conflict (id) do nothing;

drop policy if exists "level_images_bucket_read" on storage.objects;
create policy "level_images_bucket_read" on storage.objects
  for select using (bucket_id = 'level-images');

drop policy if exists "level_images_bucket_write" on storage.objects;
create policy "level_images_bucket_write" on storage.objects
  for all using (
    bucket_id = 'level-images'
    and exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role in ('super_admin', 'course_rep')
    )
  );

-- ---------- QUIZZES ----------------------------------------------------
create table if not exists public.quizzes (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  title       text not null,
  created_by  uuid not null references public.profiles(id),
  created_at  timestamptz not null default now()
);

create table if not exists public.quiz_questions (
  id             uuid primary key default gen_random_uuid(),
  quiz_id        uuid not null references public.quizzes(id) on delete cascade,
  position       integer not null default 0,
  type           text not null check (type in ('mcq', 'short')),
  prompt         text not null,
  options        jsonb,
  correct_index  integer
);

alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;

drop policy if exists "quizzes_select_all" on public.quizzes;
create policy "quizzes_select_all" on public.quizzes for select using (true);

drop policy if exists "quizzes_write_admin_rep" on public.quizzes;
create policy "quizzes_write_admin_rep" on public.quizzes
  for all using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role in ('super_admin', 'course_rep')
    )
  );

drop policy if exists "quiz_questions_select_all" on public.quiz_questions;
create policy "quiz_questions_select_all" on public.quiz_questions for select using (true);

drop policy if exists "quiz_questions_write_admin_rep" on public.quiz_questions;
create policy "quiz_questions_write_admin_rep" on public.quiz_questions
  for all using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role in ('super_admin', 'course_rep')
    )
  );

-- ---------- FEATURE FLAGS ---------------------------------------------
-- Single-row settings table so a super admin can roll a feature out to
-- course reps first, then students, rather than flipping it on for
-- everyone at once. Extend with more boolean columns as needed.
create table if not exists public.app_settings (
  id                          text primary key,
  quiz_visible_to_course_reps boolean not null default false,
  quiz_visible_to_students    boolean not null default false,
  updated_at                  timestamptz not null default now()
);

alter table public.app_settings enable row level security;

drop policy if exists "app_settings_select_all" on public.app_settings;
create policy "app_settings_select_all" on public.app_settings for select using (true);

drop policy if exists "app_settings_write_admin" on public.app_settings;
create policy "app_settings_write_admin" on public.app_settings
  for all using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'super_admin'
    )
  );
