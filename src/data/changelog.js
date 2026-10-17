// Newest first. User-facing only: short, general descriptions of what improved. No implementation detail.
// Writing rules (see "Release notes" in README.md): 2 to 5 short bullets per version, written for people using the app, only for work that has shipped.
// `date` is the full release date shown beside the version. Historical dates are fixed; a new release uses the actual date it ships.
export const CHANGELOG = [
  // FINALIZE BEFORE RELEASE: set `date` below to the real day 1.3.4 ships, in the same format as the entries beneath it (for example 'October 20, 2026').
  // While it is null the About page shows no date for this version, so nothing made-up is ever displayed.
  { version: '1.3.4', date: "October 17, 2026", title: 'Reports, categories and your data', items: [
    'Filter transactions by day, week or month, and see each transaction\'s category icon',
    'Type a calculation like 100+200+430 straight into the amount',
    'Reports now has Stats and Charts for any day, week, month, year or all time',
    'Pick icons for categories, start from ready-made categories and budgets, and see them in a clearer grid',
    'Back up, restore or clear your data from Settings, and send feedback from About',
  ] },
  { version: '1.3.3', date: 'October 16,2026', title: 'Smoother savings experience', items: [
    'Simpler money transfers between balances and savings goals',
    'Cleaner Savings and Dashboard layouts',
    'Improved mobile layouts and page headers',
    'Help Center now accessible from Settings',
  ] },
  { version: '1.3.2', date: 'October 15, 2026', title: 'Easier navigation and private balances', items: [
    'Switch between Balance and Savings on tablets and phones',
    'Hide or reveal each balance with an eye button that remembers your choice',
    'Transactions open on all dates, with a date heading above each day on phones',
    'A shorter More menu and a tidier two-column dashboard',
  ] },
  { version: '1.3.1', date: 'October 14, 2026', title: 'Savings and two balances', items: [
    'A new Savings page to set money aside and track goals with targets and progress',
    'The dashboard shows Current Balance and Savings as two separate balances',
    'Choose where income goes and which balance pays an expense',
    'Move money between balances without it counting as income or spending, with a history you can undo',
  ] },
  { version: '1.3', date: 'October 14, 2026', title: 'A new workspace design', items: [
    'A redesigned workspace with a refined sidebar and cleaner pages',
    'A reorganized dashboard with a clearer balance summary and money flow chart',
    'Cleaner lists, forms and dialogs, with a close button on every dialog',
    'More consistent light and dark themes',
  ] },
  { version: '1.2.7', date: 'October 12, 2026', title: 'Mobile polish and Help Center', items: [
    'A shorter, better balanced landing page on phones and tablets',
    'A new Help Center with answers and search',
    'A calmer look, with the background glow removed from app pages',
  ] },
  { version: '1.2.6', date: 'October 12, 2026', title: 'Landing page refresh', items: [
    'A new landing page layout with an angled preview of the dashboard',
    'Angled previews for transactions, budgets and reports',
    'Monthly money flow shown on a phone, with a creator credit for CJ',
  ] },
  { version: '1.2.5', date: 'October 12, 2026', title: 'Navigation and clarity', items: [
    'Search from the sidebar to find pages and transactions quickly',
    'A collapsible sidebar',
    'A clearer dashboard balance and an easier-to-read cash flow chart',
    'Cleaner transaction filters, with notes shown in each row',
    'Simpler month selection on Budgets and improved dropdown menus',
  ] },
  { version: '1.2.4', date: 'October 11, 2026', title: 'A darker, livelier look', items: [
    'A refined, darker and livelier look with improved animations',
    'A more polished landing page',
    'A better mobile Settings layout',
  ] },
  { version: '1.2.3', date: 'October 11, 2026', title: 'Landing page', items: [
    'A public landing page introducing TrackMyKita, with links to log in or sign up',
  ] },
  { version: '1.2.2', date: 'October 10, 2026', title: 'Clarity and polish', items: [
    'Clearer transaction titles',
    'A more prominent current balance on the dashboard',
    'Simpler profile picture controls',
    'Previous update logs now expand one at a time',
    'Fixed category menu alignment on phones',
  ] },
  { version: '1.2.1', date: 'October 10, 2026', title: 'Refinements', items: [
    'More compact category and budget lists on phones',
    'Add categories while creating a transaction or budget',
    'Shorter dates in transaction lists',
    'New page not found screen',
    'Smoother loading, empty pages and animations',
  ] },
  { version: '1.2', date: 'October 9, 2026', title: 'Security and privacy', items: [
    'Added Privacy Policy and Terms of Service pages',
    'Improved privacy and security',
    'Improved accessibility',
  ] },
  { version: '1.1.3', date: 'October 8, 2026', title: 'Sign-up and dashboard', items: [
    'Improved the email verification experience',
    'Refined the dashboard layout',
  ] },
  { version: '1.1.2', date: 'October 7, 2026', title: 'Reliability', items: ['Improved page loading and email link reliability'] },
  { version: '1.1.1', date: 'October 7, 2026', title: 'Refinements', items: ['Improved transaction management', 'Refined category management', 'Improved navigation'] },
  { version: '1.1', date: 'October 7, 2026', title: 'Polish and completeness', items: [
    'New TrackMyKita branding',
    'Improved transaction management',
    'Improved the mobile experience',
    'Added profile pictures and more currencies',
    'Added the About page',
  ] },
  { version: '1.0', date: 'October 7, 2026', title: 'Initial release', items: ['Track income and expenses', 'Monthly budgets by category', 'Categories and monthly reports', 'Light and dark theme', 'Private, secure account for your records'] },
]
