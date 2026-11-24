// Newest first. User-facing only: short, general descriptions of what improved. No implementation detail.
// Writing rules (see "Release notes" in README.md): 2 to 4 short bullets per version (one short line each), written for people using the app, only for work that has shipped.
// `date` is the full release date shown beside the version. Historical dates are fixed; a new release uses the actual date it ships.
export const CHANGELOG = [
  // FINALIZE BEFORE RELEASE: set `date` below to the real day 1.3.7 ships, in the same format as the entries beneath it (for example 'November 20, 2026').
  // While it is null the About page shows no date for this version, so nothing made-up is ever displayed.
  { version: '1.3.7', date: "November 24, 2026", title: 'A faster way to add, and a cleaner look', items: [
    'A round + button on phones and tablets for adding transactions and savings',
    'Savings and Reports are easier to read on smaller screens',
    'Notifications and a tidier header on phones and tablets',
    'A calmer home page that shows the current app',
  ] },
  { version: '1.3.6', date: "October 25, 2026", title: 'Simpler screens and phone menu', items: [
    'Simpler wording, with info icons for the details',
    'A tidier transaction form and Reports page',
    'Add to Savings can also move money back to Current Balance',
    'A simpler profile menu on phones',
  ] },
  { version: '1.3.5', date: "October 20, 2026", title: 'Interface refinements and savings improvements', items: [
    'A monthly summary and calendar on the desktop Dashboard',
    'Choose categories from an icon grid and see calculations as you type',
    'Better Reports, Budgets and Settings on phones',
    'Add new money to Savings or a goal',
  ] },
  { version: '1.3.4', date: "October 17, 2026", title: 'Reports, categories and your data', items: [
    'Reports with Stats and Charts for any period',
    'Type a calculation like 100+200 into the amount',
    'Category icons and ready-made categories and budgets',
    'Back up, restore or clear your data, and send feedback',
  ] },
  { version: '1.3.3', date: 'October 16, 2026', title: 'Smoother savings experience', items: [
    'Simpler transfers between balances and goals',
    'Cleaner Savings and Dashboard layouts',
    'Better mobile layouts, with Help Center in Settings',
  ] },
  { version: '1.3.2', date: 'October 15, 2026', title: 'Easier navigation and private balances', items: [
    'Switch between Balance and Savings on phones and tablets',
    'Hide or show each balance',
    'A shorter More menu and a tidier dashboard',
  ] },
  { version: '1.3.1', date: 'October 14, 2026', title: 'Savings and two balances', items: [
    'A Savings page with goals and progress',
    'Current Balance and Savings shown separately',
    'Move money between balances without counting it as income or spending',
  ] },
  { version: '1.3', date: 'October 14, 2026', title: 'A new workspace design', items: [
    'A redesigned workspace with a refined sidebar',
    'A clearer dashboard balance and money flow chart',
    'Cleaner lists, forms and dialogs',
    'More consistent light and dark themes',
  ] },
  { version: '1.2.7', date: 'October 12, 2026', title: 'Mobile polish and Help Center', items: [
    'A shorter, better balanced landing page on phones and tablets',
    'A new Help Center with search',
    'A calmer look inside the app',
  ] },
  { version: '1.2.6', date: 'October 12, 2026', title: 'Landing page refresh', items: [
    'A new landing page with angled app previews',
    'Monthly money flow shown on a phone',
  ] },
  { version: '1.2.5', date: 'October 12, 2026', title: 'Navigation and clarity', items: [
    'Search from the sidebar, and a collapsible sidebar',
    'A clearer dashboard balance and cash flow chart',
    'Cleaner transaction filters and budget month selection',
  ] },
  { version: '1.2.4', date: 'October 11, 2026', title: 'A darker, livelier look', items: [
    'A darker, livelier look with smoother animations',
    'A more polished landing page and mobile Settings',
  ] },
  { version: '1.2.3', date: 'October 11, 2026', title: 'Landing page', items: [
    'A public landing page with links to log in or sign up',
  ] },
  { version: '1.2.2', date: 'October 10, 2026', title: 'Clarity and polish', items: [
    'Clearer transaction titles and a more prominent balance',
    'Simpler profile picture controls',
    'Previous update logs expand one at a time',
  ] },
  { version: '1.2.1', date: 'October 10, 2026', title: 'Refinements', items: [
    'More compact lists on phones',
    'Add categories while creating a transaction or budget',
    'A new page not found screen and smoother loading',
  ] },
  { version: '1.2', date: 'October 9, 2026', title: 'Security and privacy', items: [
    'Privacy Policy and Terms of Service pages',
    'Improved privacy, security and accessibility',
  ] },
  { version: '1.1.3', date: 'October 8, 2026', title: 'Sign-up and dashboard', items: [
    'A better email verification experience',
    'A refined dashboard layout',
  ] },
  { version: '1.1.2', date: 'October 7, 2026', title: 'Reliability', items: ['Improved page loading and email link reliability'] },
  { version: '1.1.1', date: 'October 7, 2026', title: 'Refinements', items: ['Improved transaction and category management', 'Improved navigation'] },
  { version: '1.1', date: 'October 7, 2026', title: 'Polish and completeness', items: [
    'New TrackMyKita branding and the About page',
    'Profile pictures and more currencies',
    'An improved mobile experience',
  ] },
  { version: '1.0', date: 'October 7, 2026', title: 'Initial release', items: ['Track income and expenses', 'Monthly budgets by category', 'Categories and monthly reports', 'Light and dark theme', 'Private, secure account for your records'] },
]
