# ASISA — Setup

Community platform for the Department of Actuarial Science & Insurance,
University of Lagos.

## Connect your Supabase project

1. Create a Supabase project (or use the existing `uni-lagos-asisa-hub` project).
2. Run the SQL in [`supabase/schema.sql`](./supabase/schema.sql) once (tables, RLS, storage, seed).
3. Copy your project URL and publishable/anon key into `.env` at the repo root:

   ```
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<publishable or anon key>
   ```

4. In Supabase Dashboard → **Authentication → Providers → Email**, turn off
   **Confirm email** while developing (optional but easier for local testing).
5. Restart the dev server (`npm run dev` / `yarn dev`).

## First super admin

After you create your first account in the app, promote it in the SQL editor:

```sql
insert into public.user_roles (user_id, role)
select id, 'super_admin'
from auth.users
where email = 'you@example.com'
on conflict do nothing;
```

Then sign out and sign back in. From **Super admin** you can assign course-rep
roles and manage departments/sessions.

## Demo mode (no Supabase yet)

Without env vars the app runs entirely in the browser using localStorage. To try
each role, sign in with:

| Role         | Email                     |
| ------------ | ------------------------- |
| Super admin  | `admin@asisa.unilag.edu`  |
| Course rep   | `rep@asisa.unilag.edu`    |
| Student      | any other email           |

Any password works in demo mode.

## Storage buckets

The schema creates three public-read buckets:

- `course-thumbnails` — course cover images
- `profile-photos` — student avatars
- `group-images` — group covers

Course files and past questions are linked as Google Drive URLs on `courses`.

## Authorization

Enforced by Row Level Security:

- **Super admin** — full read/write
- **Course representative** — write courses in assigned department/level
- **Student** — scoped feeds, own posts/comments/reactions/profile

## Tech stack

- Vite + React + TypeScript
- Tailwind CSS v4 (`src/styles.css`)
- shadcn/ui + TanStack Router / Query
- `@supabase/supabase-js` for auth, data, and storage
