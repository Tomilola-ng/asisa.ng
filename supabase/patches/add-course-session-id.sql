-- Minimal fix: add academic session to courses.
-- Run in Supabase → SQL Editor, then wait ~30s (or reload the app).

alter table public.courses
  add column if not exists session_id uuid references public.sessions(id) on delete set null;

-- Refresh PostgREST schema cache (Supabase API layer)
notify pgrst, 'reload schema';
