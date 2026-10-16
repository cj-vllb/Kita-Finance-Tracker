# TrackMyKita

TrackMyKita is a personal finance tracker for recording income and expenses, setting monthly budgets and seeing where your money goes, all in one personal account.

**Current version:** 1.3.1

Version 1.3.1 adds Savings: Current Balance and Savings are two separate balances, income can be sent to either, expenses can be paid from either, money moves between them as transfers (never income or expenses), and savings goals set aside parts of Savings. It needs the database migration `20261014000000_savings_and_balances.sql` (see `SUPABASE_SETUP.md`).

Version 1.2 is a security, privacy and accessibility release: Privacy Policy and Terms pages, self-hosted fonts, sanitised analytics, security headers, clearer errors, fuller cleanup when an account is deleted, and accessibility fixes.

## Features

- Track income and expenses, with edit, delete, search and filtering
- Monthly budgets by category with progress indicators
- Income and expense categories with colors
- Dashboard overview and monthly reports
- Current Balance and Savings kept apart, savings goals, transfers and an undoable savings history
- 16 currencies, profile pictures, light and dark theme
- CSV export
- Email sign-up with confirmation, password reset and account deletion
- Responsive layout for desktop, tablet and phone
- Privacy Policy and Terms of Service pages

## Tech stack

- React 18 and Vite
- React Router
- Supabase (Auth, Postgres with row level security, Storage)
- Vercel (hosting, Web Analytics, Speed Insights)
- IBM Plex Sans and Poppins, self-hosted through Fontsource

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase values
npm run dev
```

Build for production with `npm run build`. Run the money-rule unit tests with `npm test` (Node's built-in test runner, no extra dependencies).

### Environment variables

| Variable | Description |
| --- | --- |
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase publishable (public) key |

Never commit `.env.local` or any service-role key. Backend setup is described in [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md).

## Deployment

Deployed on Vercel; `vercel.json` rewrites all routes to `index.html` for client-side routing and sets security headers. The Content Security Policy is currently sent in report-only mode; check the browser console on the deployed site before switching it to enforcing. Add your site's `/email-confirmed` URL to the Supabase Auth redirect URL allow list so confirmation links work.

## Author

Created by CJ, [www.workwithcj.digital](https://www.workwithcj.digital)

## Release notes (About page update log)

The update log in `src/data/changelog.js` is shown to people using the app, so it follows these rules. Check them before adding or editing an entry.

1. Describe only features and improvements that were actually implemented and released. Never list unfinished work.
2. Write for ordinary TrackMyKita users: what got better or easier, not how it was built.
3. Leave out implementation detail (components, hooks, state, database triggers, functions, migrations, policies).
4. Keep it short: about 2 to 5 short bullets per normal release, fewer for a small one. Do not repeat the same change in several bullets or pad to reach a number.
5. Keep version numbers and release dates accurate. Use the real date a version ships; never invent or change a date without evidence.
6. Put migration, testing and deployment notes in developer documentation (this README, `SUPABASE_SETUP.md`), not in the update log.

Good: "Improved the reliability of savings transfers." Avoid: "Added a trigger that validates the goal foreign key."
