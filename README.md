# ASISA — Setup

Community platform for the Department of Actuarial Science & Insurance,
University of Lagos.

## Connect your Supabase project

1. In your Supabase project, run the SQL in
   [`supabase/schema.sql`](./supabase/schema.sql). It creates every table,
   RLS policy, storage bucket, and helper function. Roles are stored in a
   dedicated `user_roles` table (never on profiles).
2. Copy your project URL and anon key into a `.env` at the repo root:

   ```
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
   ```

3. Restart the dev server. The auth context in `src/lib/auth-context.tsx`
   automatically switches from the demo/localStorage mode to real Supabase
   Auth once the env vars are present.

## Demo mode (no Supabase yet)

Without env vars the app runs entirely in the browser using an in-memory
store and localStorage. To try each role, sign in with:

| Role         | Email                     |
| ------------ | ------------------------- |
| Super admin  | `admin@asisa.unilag.edu`  |
| Course rep   | `rep@asisa.unilag.edu`    |
| Student      | any other email           |

Any password works in demo mode.

## Storage buckets

The schema creates three public-read buckets, matching the product spec:

- `course-thumbnails` — 16:5 course cover images
- `profile-photos` — student avatars
- `group-images` — user-created group covers

All other course files and past questions are linked directly as Google
Drive URLs on the `courses` table (`drive_folder_url`, `past_questions_url`).

## Authorization

Every scope is enforced by Row Level Security, not by hiding UI:

- **Super admin** — full read/write across all tables.
- **Course representative** — `is_course_rep_for(user, department, level)`
  gates every write on `courses` (and thumbnail uploads). A rep scoped to
  ASI · 300L cannot touch 200L or another department's course, even by
  crafting a direct API call.
- **Student** — read scoped feeds they belong to (department, class,
  joined groups), write own posts/comments/reactions, and manage their
  own profile.

## Tech stack

- Vite + React + TypeScript
- Tailwind CSS v4 (design tokens in `src/styles.css`)
- shadcn/ui components
- `react-bootstrap-icons` for iconography
- `@supabase/supabase-js` for auth, data, and storage
- TanStack Router for file-based routing

## Design tokens

Palette lives in `src/styles.css` under `:root`:

| Token          | Value    |
| -------------- | -------- |
| `--evergreen`  | #132a13  |
| `--hunter`     | #31572c  |
| `--fern`       | #4f772d  |
| `--palm`       | #90a955  |
| `--lime-cream` | #ecf39e  |

Typography: DM Sans (headings) + Inter (body), loaded via `@fontsource`.
