# ASISA — Setup

Community platform for the Department of Actuarial Science & Insurance,
University of Lagos.

## Connect your Supabase project

1. Create a Supabase project (or use the existing `uni-lagos-asisa-hub` project).
2. Run the SQL in [`supabase/schema.sql`](./supabase/schema.sql) once (tables, RLS, storage, seed).
3. Run [`supabase/patches/level-images-and-quizzes.sql`](./supabase/patches/level-images-and-quizzes.sql)
   once (level images, quizzes, and the feature-flags table used to roll Quiz out in stages —
   see [Quiz](#quiz)). Migrations here are plain SQL files, not CLI-managed — running each patch
   in the SQL editor is a manual, one-time step; nothing runs them for you on deploy.
4. Copy your project URL and publishable/anon key into `.env` at the repo root:

   ```
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<publishable or anon key>
   ```

5. In Supabase Dashboard → **Authentication → Providers → Email**, turn off
   **Confirm email** while developing (optional but easier for local testing).
6. Restart the dev server (`npm run dev` / `bun run dev`).

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

If you already deployed an older schema, run
[`supabase/patches/admin-improvements.sql`](./supabase/patches/admin-improvements.sql)
once in the SQL editor (course sessions, thumbnail upload fix, admin delete user).

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
