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

## 1.3.1 database update (Savings & balances)
Apply `supabase/migrations/20261014000000_savings_and_balances.sql` with `supabase db push` (local or staging first) **before** deploying the 1.3.1 frontend. It is additive and idempotent: nothing is dropped, rewritten or deleted.
- `transactions.balance` (`current` | `savings`, default `current`) and `transactions.goal_id`. Income: where it goes. Expense: where it is paid from. Every existing row becomes `current`, which is how it was always counted, so existing balances do not change.
- New tables `savings_goals`, `savings_transfers` (money moved between the two balances) and `savings_reallocations` (money re-earmarked inside Savings). All have RLS (`user_id = auth.uid()`) and composite foreign keys, so a row can never reference another user's goal. Goals have no DELETE policy (they are archived); transfers and moves can be undone (deleted) but not edited.
- Balances are never stored; they are derived from these rows, in the app (`src/utils/ledger.js`) and, for protection, in the database. After every write that touches Savings, an AFTER ROW trigger takes a **per-user transaction-level advisory lock** (`kita_lock_user`) and then re-checks the user's whole ledger in later statements. The check runs inside the writing statement, so a rejected request returns its error and writes nothing. Because the lock is held until commit and every statement reads a fresh READ COMMITTED snapshot, two simultaneous writes by the same user are serialized: the second waits, sees the first's committed rows, and is rejected if the money is gone. A goal or General Savings can never go below zero, and a deleted (archived) goal must stay empty. Once money has been moved to Savings, removing income that would leave Current Balance negative is also refused. Ordinary expenses from Current Balance keep the app's long-standing behaviour of being allowed to exceed the balance (they cannot break a Savings rule, so they do not take the lock). Savings writes under REPEATABLE READ or SERIALIZABLE are refused (the lock only works with per-statement snapshots); PostgREST uses READ COMMITTED. The error text starts with `KITA: ` and is shown to the user as is.
- `archive_savings_goal(goal, move_to, date)` takes the lock, moves a goal's money to General Savings or another goal, and archives it, in one transaction. It is the only way to archive: clients may only rename a goal or change its target (column-level UPDATE grant). The helper functions (`kita_*`) are not executable through the API.
- Tests: `supabase/tests/database/05_savings.test.sql` (pgTAP, run with `supabase test db` against a local/dev database), `supabase/tests/manual/savings_concurrency.md` (two-session concurrency checks, to run once on staging) and `npm test` for the pure ledger logic. None of the database checks had been executed when this was written.

If an earlier attempt to apply this migration failed (an older copy of this file had invalid PL/pgSQL variable declarations), first check staging for leftovers with the read-only queries in the project notes: `select to_regclass('public.savings_goals');`, `select column_name from information_schema.columns where table_schema='public' and table_name='transactions' and column_name in ('balance','goal_id');` and `select version from supabase_migrations.schema_migrations order by version desc limit 3;`. Then apply this corrected file; it is written to be re-runnable.

Until the migration is applied the app still works exactly as in 1.3: the Savings page explains that the update is missing, and the dashboard and transaction form show no savings controls.
