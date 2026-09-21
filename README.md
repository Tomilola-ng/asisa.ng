# ASISA — Setup

Community platform for the Department of Actuarial Science & Insurance,
University of Lagos.

## Connect your Supabase project

Migrations here are plain SQL files, not CLI-managed — every step below is a
manual, one-time run in the Supabase SQL editor. Nothing runs them for you on
deploy, so a new environment (or a teammate's existing project) needs to run
them in this order.

1. Create a Supabase project (or use the existing `uni-lagos-asisa-hub` project).
2. Run [`supabase/schema.sql`](./supabase/schema.sql) once (tables, RLS, storage, seed).
   This file is the current full schema for a **fresh** project — it already
   includes course sessions, the courses↔departments many-to-many join table,
   and the non-recursive RLS policies described below.
3. Run [`supabase/patches/level-images-and-quizzes.sql`](./supabase/patches/level-images-and-quizzes.sql)
   once (level images, quizzes, and the feature-flags table used to roll Quiz out in stages —
   see [Quiz](#quiz)).
4. **If your project was created before this Quiz PR** (i.e. `schema.sql` was
   run against your DB before it included sessions/multi-department support),
   also run, in order:
   - [`supabase/patches/add-course-session-id.sql`](./supabase/patches/add-course-session-id.sql) — adds `courses.session_id`; then set `VITE_COURSES_HAVE_SESSION=true`.
   - [`supabase/patches/course-departments-many-to-many.sql`](./supabase/patches/course-departments-many-to-many.sql) — adds the `course_departments` join table; then set `VITE_COURSES_MULTI_DEPT=true`.
   - [`supabase/patches/fix-thumbnail-storage-rls.sql`](./supabase/patches/fix-thumbnail-storage-rls.sql) — fixes a "new row violates row-level security policy" error on course thumbnail upload.

   (`supabase/patches/admin-improvements.sql` bundles the session-id and
   thumbnail-RLS fixes above into one file if you'd rather run one patch —
   don't run both it and the two individual patches it covers.)
5. Run [`supabase/patches/fix-courses-recursion.sql`](./supabase/patches/fix-courses-recursion.sql)
   once — **required on every existing project**, even ones already on the
   latest `schema.sql`-based install, since the `courses` and
   `course_departments` write policies previously called each other in a raw
   subquery and Postgres throws `infinite recursion detected in policy for
   relation "courses"` the first time a course rep or admin adds/edits a
   course with a linked department. The patch moves those checks into
   `SECURITY DEFINER` helper functions instead. Brand-new projects that ran
   the current `schema.sql` (step 2) already have the fix and can skip this.
6. Run [`supabase/patches/fix-admin-delete-user.sql`](./supabase/patches/fix-admin-delete-user.sql)
   once if **Admin → Delete user** fails with a missing-function error. This
   creates `admin_delete_user` and cleans quiz ownership so deletes aren't
   blocked by foreign keys.
7. Copy your project URL and publishable/anon key into `.env` at the repo root:

   ```
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<publishable or anon key>
   ```

   If you ran the multi-department and/or course-session patches in step 4,
   also uncomment the matching flags in `.env` (see `.env.example`):

   ```
   VITE_COURSES_HAVE_SESSION=true
   VITE_COURSES_MULTI_DEPT=true
   ```

8. In Supabase Dashboard → **Authentication → Providers → Email**, turn off
   **Confirm email** while developing (optional but easier for local testing).
9. Restart the dev server (`npm run dev` / `bun run dev`).

## First super admin

After you create your first account in the app, promote it in the SQL editor:

```sql
insert into public.user_roles (user_id, role)
select id, 'super_admin'
from auth.users
where email = 'you@example.com'
on conflict do nothing;
```

Then sign out and sign back in. From **Super admin** you can manage users and
departments, and assign course-rep roles.

If you already deployed an older schema, see step 4–5 under
[Connect your Supabase project](#connect-your-supabase-project) for the
patches you still need to run (`admin-improvements.sql` also covers admin
delete-user, on top of the session-id and thumbnail-RLS fixes it bundles).

## Demo mode (no Supabase yet)

Without env vars the app runs entirely in the browser using localStorage. To try
each role, sign in with:

| Role         | Email                     |
| ------------ | ------------------------- |
| Super admin  | `admin@asisa.unilag.edu`  |
| Course rep   | `rep@asisa.unilag.edu`    |
| Student      | any other email           |

Any password works in demo mode. Demo sign-in reuses whatever demo account is
already stored in the browser regardless of which email you type next — clear
`localStorage` (or use a private window) to start as a different role.

## Level images

Course thumbnails are set once per level (100–500), not per course, so the
same picture isn't uploaded/stored for every course at that level. Super
admins and course reps manage them from **Admin → Level images** or
**Rep → Level images**; every course at a level picks up that level's image
automatically.

## Quiz

Admins and course reps can turn a document — a `.pdf`, `.txt`, `.md`, or a
photo/scan of a question sheet (`.png`/`.jpg`/`.webp`, OCR'd client-side with
Tesseract) — into a quiz:

1. Upload the file. Numbered questions and lettered multiple-choice options
   are extracted automatically; a two-column exam layout is auto-detected
   (or can be forced with a checkbox) so OCR doesn't interleave the columns.
2. Review and edit the extracted questions, options, and correct answers.
3. Pick the course the quiz belongs to and publish.

Students and reps then take it from the **Quiz** tab, with the built-in
multiple-choice questions auto-graded.

### Staged rollout

Quiz is hidden by default for course reps and students — a super admin
always sees it. Turn it on for each group independently from
**Admin → Quiz rollout**, so it can go out to reps first and students later.

## Storage buckets

The schema creates public-read buckets:

- `course-thumbnails` — legacy per-course cover images (superseded by level images, see above)
- `profile-photos` — student avatars
- `group-images` — group covers
- `level-images` — one shared cover image per level (added by
  [`level-images-and-quizzes.sql`](./supabase/patches/level-images-and-quizzes.sql))

Course files and past questions are linked as Google Drive URLs on `courses`.

## Authorization

Enforced by Row Level Security:

- **Super admin** — full read/write, including feature-flag rollout controls
- **Course representative** — write courses in assigned department/level; publish quizzes once Quiz is rolled out to reps
- **Student** — scoped feeds, own posts/comments/reactions/profile; take quizzes once Quiz is rolled out to students

## Tech stack

- Vite + React + TypeScript
- Tailwind CSS v4 (`src/styles.css`)
- shadcn/ui + TanStack Router / Query
- `@supabase/supabase-js` for auth, data, and storage
- `pdfjs-dist` for PDF text extraction and `tesseract.js` for client-side OCR (Quiz)
