# Supabase setup
1. Keep your existing `.env.local` (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY). It is git-ignored; `.env.example` has placeholders only.
2. Apply the schema: `supabase link --project-ref <ref>` then `supabase db push`, or paste `supabase/migrations/20261007000000_init_kita.sql` into the SQL editor of an EMPTY project.
3. Dashboard > Authentication > URL Configuration: set Site URL to your app URL and add `<app-url>/login`, `<app-url>/reset-password`, `<app-url>/profile` to Redirect URLs (localhost:5173 for dev, your real domain for production).
4. Run the pgTAP suite against a LOCAL or DEV database: `supabase start && supabase test db` (files in `supabase/tests/database/`; each rolls back).
5. `npm install && npm run dev`.

## Profile initialization
Profiles are created ONLY by the `on_auth_user_created` database trigger (`public.handle_new_user`). The frontend never inserts profiles.
`20261007120000_profile_trigger_backfill.sql` re-asserts the trigger, backfills auth users with no profile, and re-asserts RLS policies. Apply with `supabase db push`.

## 1.1.0 database update (profile pictures + currencies)
Apply `supabase/migrations/20261009000000_profile_avatars_currencies.sql` with `supabase db push` **before** deploying the 1.1.0 frontend. It is additive and idempotent:
- adds `profiles.avatar_path` (nullable; NULL means "show initials"), constrained to the owner's own folder;
- widens the `profiles.currency` CHECK from PHP/USD/EUR to 16 currencies (existing values stay valid);
- creates the **private** `avatars` bucket (2 MB, JPG/PNG/WebP) with per-user storage policies. Files live at `<user id>/<file>`; the app reads them through short-lived signed URLs. There is no public URL.

Until it is applied the app still works; only photo upload shows "Profile pictures are not set up yet", and new currencies are rejected by the database.
Tests: `supabase/tests/database/04_avatars_currency.test.sql` (run with `supabase test db` against a local/dev database).

## Delete account: how it works and its limits
`delete_my_account()` removes the auth user; foreign keys cascade to the profile, categories, transactions and budgets. Storage files cannot be deleted from SQL (Supabase blocks direct deletes of storage rows), so the app deletes the user's profile picture through the Storage API *just before* calling the function. If that cleanup fails, the account is still deleted and an orphaned image file can remain in the bucket; clear it from the dashboard if needed.

## 1.1.1 database update (optional description + category colors)
Apply `supabase/migrations/20261010000000_optional_fields_and_category_colors.sql` with `supabase db push`.
- **Required to save a transaction with no description.** The original schema had `description NOT NULL`; if `20261008000000_optional_transaction_description.sql` was never applied to your project, Postgres rejects an empty description (error 23502). This migration re-applies the fix and is safe to run again.
- Widens the category color check. Old values (green, amber, brick, slate, grey) remain valid; the app displays brick/amber/slate as Red/Orange/Blue without rewriting any row.

## Production deployment (Vercel) and sign-in links
- `vercel.json` rewrites every path to `index.html`, so direct visits and refreshes of client-side routes (`/dashboard`, `/transactions`, `/login`, ...) load the app instead of a Vercel 404. Files that really exist (JS, CSS, favicon, fonts, images) are still served first, as normal on Vercel.
- The app builds every auth redirect from `window.location.origin` (no hard-coded domains): signup confirmation -> `/login`, password reset -> `/reset-password`, email change -> `/profile`. A signed-in user who lands on `/login` is sent on to `/dashboard`.
- **Supabase dashboard (not code, set manually):** Authentication > URL Configuration. Site URL `https://trackmykita.online`; Redirect URLs `https://trackmykita.online/login`, `https://trackmykita.online/reset-password`, `https://trackmykita.online/profile`. If Site URL still points somewhere else, confirmation emails will link to the wrong place.
- `supabase/config.toml` lists `localhost:5173` only for the local CLI stack; it does not affect production.
