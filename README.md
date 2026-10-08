# TrackMyKita

TrackMyKita is a personal finance tracker for recording income and expenses, setting monthly budgets and seeing where your money goes, all in one private account.

**Current version:** 1.1.3

## Features

- Track income and expenses, with edit, delete, search and filtering
- Monthly budgets by category with progress indicators
- Income and expense categories with colors
- Dashboard overview and monthly reports
- 16 currencies, profile pictures, light and dark theme
- CSV export
- Email sign-up with confirmation, password reset and account deletion
- Responsive layout for desktop, tablet and phone

## Tech stack

- React 18 and Vite
- React Router
- Supabase (Auth, Postgres with row level security, Storage)
- Vercel (hosting, Web Analytics, Speed Insights)

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase values
npm run dev
```

Build for production with `npm run build`.

### Environment variables

| Variable | Description |
| --- | --- |
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase publishable (public) key |

Never commit `.env.local` or any service-role key. Backend setup is described in [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md).

## Deployment

Deployed on Vercel; `vercel.json` rewrites all routes to `index.html` for client-side routing. Add your site's `/email-confirmed` URL to the Supabase Auth redirect URL allow list so confirmation links work.

## Author

Created by CJ, [www.workwithcj.digital](http://www.workwithcj.digital)
