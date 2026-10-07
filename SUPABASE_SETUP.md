# Supabase setup
1. Keep your existing `.env.local` (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY). It is git-ignored; `.env.example` has placeholders only.
2. Apply the schema: `supabase link --project-ref <ref>` then `supabase db push`, or paste `supabase/migrations/20261007000000_init_kita.sql` into the SQL editor of an EMPTY project.
3. Dashboard > Authentication > URL Configuration: set Site URL to your app URL and add `<app-url>/login`, `<app-url>/reset-password`, `<app-url>/profile` to Redirect URLs (localhost:5173 for dev, your real domain for production).
4. Run the pgTAP suite against a LOCAL or DEV database: `supabase start && supabase test db` (files in `supabase/tests/database/`; each rolls back).
5. `npm install && npm run dev`.

## Profile initialization
Profiles are created ONLY by the `on_auth_user_created` database trigger (`public.handle_new_user`). The frontend never inserts profiles.
`20261007120000_profile_trigger_backfill.sql` re-asserts the trigger, backfills auth users with no profile, and re-asserts RLS policies. Apply with `supabase db push`.
