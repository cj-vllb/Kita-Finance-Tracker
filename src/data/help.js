// Help Center content. Static text only: nothing here reads the user's data or calls Supabase.
// Every statement describes behaviour that exists in the app today; if a page changes, update the matching entry.
// `p`: paragraphs. `steps`: numbered steps (optional). `see`: ids of related entries (rendered as links within the Help Center).
// `links`: [{ to, label }] real app routes. `mail`: show the support email link. `keys`: extra words the search should match.
import { CONTACT_EMAIL } from './site.js'

export const SUPPORT_EMAIL = CONTACT_EMAIL

export const HELP = [
  { id: 'getting-started', title: 'Getting started', items: [
    { id: 'what-is', q: 'What is TrackMyKita?', keys: 'about overview bank advice',
      p: ['TrackMyKita is a personal finance tracker. You record your own income and expenses, sort them into categories, set monthly budgets and read simple reports about where your money goes.',
        'It does not connect to your bank, so what you see is what you entered. It is a tracking and organizing tool and does not give financial, investment, tax or legal advice.'] },
    { id: 'first-steps', q: 'How do I get started?', keys: 'begin first new account setup', see: ['add-tx', 'create-category', 'create-budget'],
      steps: ['Open Categories and create a few, such as Salary for income and Food for expenses. Categories are optional, and you can also create one while adding a transaction.',
        'Open Transactions and choose Add transaction to record your first income or expense.',
        'Optional: open Budgets and create a monthly limit for an expense category.',
        'Check the Dashboard and Reports to see your balance and spending take shape.'] },
    { id: 'navigation', q: 'How do I move around the app?', keys: 'menu sidebar tabs phone tablet more navigation',
      p: ['On a computer, the sidebar lists Dashboard, Transactions, Reports, Budgets, Savings and Categories, with Help Center, Settings and your account at the bottom. You can collapse the sidebar with the button at its top.',
        'On a tablet, the sidebar becomes a slim icon bar. On a phone, a bar at the bottom shows Dashboard, Transactions and Reports, and More opens Budgets, Savings, Categories, Help Center, Settings and Profile.'] },
    { id: 'sidebar-search', q: 'How does the search in the sidebar work?', keys: 'find jump quick search bar',
      p: ['Type in the Search box to jump to a page, such as Budgets or Settings, or to find one of your transactions by its title, category, note, type, amount or date. Choose a result to open it. Help topics are included too.',
        'On a tablet the search is the magnifying-glass icon at the top of the icon bar. On a phone the sidebar search is not shown; use the search box on the Transactions page instead.'] },
  ] },

  { id: 'dashboard', title: 'The Dashboard', items: [
    { id: 'dash-overview', q: 'What does the Dashboard show?', keys: 'home overview balance income expenses net change charts',
      p: ['The top card shows your Current Balance, plus this month\u2019s income, expenses and net change (and the share of income you kept). Below it you will find your latest transactions, the budgets closest to their limit, a Monthly money flow chart, a small Reports chart and a This month at a glance summary.'],
      links: [{ to: '/dashboard', label: 'Open the Dashboard' }] },
    { id: 'balance', q: 'How are my Current Balance and Savings worked out?', keys: 'total money how much current balance savings two balances',
      p: ['Your current balance is all the income you have recorded minus all the expenses you have recorded. It is not a bank balance, so it only matches your bank account if you have entered every transaction.'] },
    { id: 'glance', q: 'What does \u201cThis month at a glance\u201d mean?', keys: 'highest spending compared last month budget status',
      p: ['Highest spending category is the expense category with the most spending this month. Compared with the previous month shows whether you have spent less or more than the month before, or \u201cNo earlier data\u201d when there is nothing to compare. Budget status shows how many of this month\u2019s budgets are within their limit.'], see: ['budget-about'] },
  ] },

  { id: 'transactions', title: 'Managing transactions', items: [
    { id: 'add-tx', q: 'How do I add a transaction?', keys: 'new record create income expense save',
      steps: ['Open Transactions and choose Add transaction.', 'Choose Expense or Income.', 'Choose whether the money goes to, or is paid from, Current Balance or Savings. Current Balance is the default.', 'Enter the amount. It must be above zero.',
        'Optional: pick a category, give the transaction a title and add a note.', 'Check the date, which is today by default, then choose Save transaction.'],
      links: [{ to: '/transactions/new', label: 'Add a transaction' }], see: ['optional-fields', 'inline-category'] },
    { id: 'optional-fields', q: 'Do I need to give a category or a title?', keys: 'untitled optional notes description',
      p: ['No. The category, title and notes are all optional. If you leave the title blank, the category name is shown instead. Notes are shown in the transaction list when you add one.'] },
    { id: 'inline-category', q: 'Can I create a category while adding a transaction?', keys: 'new category inline',
      p: ['Yes. In the Category menu choose + Add category, create it, and it is selected for you. The same option, + Add expense category, is available when you create a budget.'] },
    { id: 'edit-delete-tx', q: 'How do I edit or delete a transaction?', keys: 'change remove fix mistake undo',
      p: ['On Transactions, open the menu at the end of a row and choose View, Edit or Delete. You can also open a transaction and use Edit or Delete there. Deleting asks you to confirm first, and a deleted transaction cannot be restored.'] },
    { id: 'search-filter', q: 'How do I find or filter transactions?', keys: 'search filter sort month date type category reset page',
      p: ['Type in the search box to match a transaction\u2019s title or category. Choose Filter to narrow the list by Date (a single month or all dates), Type and Category, and to sort by newest, oldest, highest or lowest amount. Reset clears your filters.',
        'By default the list shows the current month, so choose All dates to see everything. The list shows 10 transactions at a time; use Previous and Next to move between pages.'],
      links: [{ to: '/transactions', label: 'Open Transactions' }], see: ['ts-missing-tx'] },
    { id: 'export', q: 'How do I export my transactions?', keys: 'csv download spreadsheet backup data',
      p: ['Open Settings and choose Export CSV in the Data section. It downloads all of your transactions as a spreadsheet file. If you have no transactions yet, there is nothing to export.'],
      links: [{ to: '/settings', label: 'Open Settings' }] },
  ] },

  { id: 'categories', title: 'Managing categories', items: [
    { id: 'categories-about', q: 'What are categories for?', keys: 'groups income expense colors',
      p: ['Categories group your transactions, for example Salary for money coming in and Food for money going out. Income categories are for money coming in and expense categories are for money going out. Budgets use expense categories, and the Reports page groups your spending by category.'],
      links: [{ to: '/categories', label: 'Open Categories' }] },
    { id: 'create-category', q: 'How do I create or edit a category?', keys: 'new add rename color name',
      steps: ['Open Categories and choose Create category (or the add link under the Income or Expense list).', 'Choose the type, Expense or Income.',
        'Enter a name. It can be up to 30 characters and must be different from your other categories.', 'Optional: pick a color, then choose Save category.',
        'To change a category later, open the menu on its row and choose Edit category.'],
      links: [{ to: '/categories/new', label: 'Create a category' }] },
    { id: 'delete-category', q: 'Why can\u2019t I delete a category?', keys: 'remove in use blocked',
      p: ['A category that any transaction or budget uses cannot be deleted. The message tells you how many are using it. Edit or delete those first, then delete the category. For the same reason, the type of a category that is in use is locked.'] },
  ] },

  { id: 'budgets', title: 'Using budgets', items: [
    { id: 'budget-about', q: 'How do budgets work?', keys: 'limit spending remaining over warning progress bar',
      p: ['A budget is a monthly spending limit for one expense category. TrackMyKita adds up that category\u2019s expenses for the month and shows a progress bar, how much you have spent and how much is left.',
        'When a budget reaches 80% used, you get a warning. Above 100% it shows how much you are over budget.'],
      links: [{ to: '/budgets', label: 'Open Budgets' }] },
    { id: 'create-budget', q: 'How do I create or change a budget?', keys: 'new add edit delete limit amount month',
      steps: ['Open Budgets and choose Create budget.', 'Choose an expense category, or + Add expense category to make one.', 'Enter the monthly amount. It must be above zero.',
        'Choose the month, then choose Save budget.', 'To change a budget later, open the menu on its row and choose Edit budget or Delete budget.'],
      p: ['You can have one budget per category for each month.'],
      links: [{ to: '/budgets/new', label: 'Create a budget' }], see: ['budget-months', 'ts-budget-exists'] },
    { id: 'budget-months', q: 'How do I see or plan a different month?', keys: 'month next previous picker',
      p: ['Use the month picker at the top of Budgets. Every month has its own budgets, and the current and next month are always available. Budgets are not copied from one month to the next, so create the ones you want for each month.'] },
  ] },

  { id: 'savings', title: 'Savings and goals', items: [
    { id: 'savings-about', q: 'What are Current Balance and Savings?', keys: 'two balances separate spend save wallet total',
      p: ['TrackMyKita keeps two balances apart. Current Balance is the money you have available to spend. Savings is money you have put aside. They are never added together into one total.',
        'Current Balance is the income sent to it, minus the expenses paid from it, plus money moved in from Savings and minus money moved out to Savings. Savings works the same way in the other direction. Neither is a bank balance, so they only match your bank if you have entered everything.',
        'Money you recorded before Savings existed counts toward Current Balance, exactly as before.'],
      links: [{ to: '/savings', label: 'Open Savings' }], see: ['savings-income', 'savings-transfer'] },
    { id: 'savings-income', q: 'How do I send income to Savings, or pay an expense from Savings?', keys: 'destination source add to paid from goal',
      steps: ['Open Transactions and choose Add transaction.', 'Choose Income or Expense.', 'Under Add to (income) or Paid from (expense), choose Current Balance or Savings. Current Balance is the default.',
        'If you chose Savings, you can pick a savings goal, or leave it as General Savings. You do not need any goals to use Savings.', 'Save the transaction.'],
      p: ['Income sent to Savings is still income, and an expense paid from Savings is still an expense. Both count once in your Reports, and the expense counts toward its category budget. Only the balance they change is different.',
        'An expense paid from Savings can only use money that is not set aside for another goal: pick the goal it uses, or have enough unassigned Savings.'],
      links: [{ to: '/transactions/new', label: 'Add a transaction' }] },
    { id: 'savings-transfer', q: 'How do I move money between Current Balance and Savings?', keys: 'transfer add to savings withdraw move back',
      steps: ['Open Savings.', 'Choose Add to Savings to move money from Current Balance, or Withdraw to move money back.', 'Enter the amount, and choose the goal (or General Savings) it goes to or comes from.', 'Confirm.'],
      p: ['A transfer is not income and not an expense, so it never changes your Reports, budgets or category spending. You can only move money you actually have in the balance it leaves.'],
      links: [{ to: '/savings', label: 'Open Savings' }] },
    { id: 'savings-goals', q: 'How do savings goals work?', keys: 'target progress allocate earmark general unassigned remaining',
      p: ['A goal has a name and a target. It does not hold money of its own: it sets aside part of the money already in Savings. Creating a goal or changing its target never moves money.',
        'Each goal shows how much is set aside, how much is left to reach the target and your progress. Savings that is not set aside for any goal is shown as Unassigned, or General Savings. Goal amounts and Unassigned always add up to your Savings balance.',
        'Use Add money, Withdraw or Move money in a goal\u2019s menu to change what is set aside. Moving money between goals does not change Current Balance or Savings.'],
      links: [{ to: '/savings', label: 'Open Savings' }], see: ['savings-delete-goal'] },
    { id: 'savings-delete-goal', q: 'What happens when I delete a goal?', keys: 'remove archive goal money',
      p: ['A goal that still holds money cannot simply disappear. You choose where its money goes, General Savings or another goal, and then the goal is removed from your lists. The money stays in Savings, and the goal\u2019s past activity stays in your history.'] },
    { id: 'savings-undo', q: 'Why can\u2019t I edit, delete or undo something in Savings?', keys: 'blocked refused not enough negative error',
      p: ['TrackMyKita will not let a change leave a goal, General Savings or your Current Balance below zero. For example, you cannot delete income that has already been spent or moved, or undo a transfer whose money is gone. The message names what is short. Move money back, or reduce the amount, and try again.',
        'To undo a transfer or a move, open its menu in Savings activity and choose Undo.'],
      links: [{ to: '/savings', label: 'Open Savings' }] },
  ] },

  { id: 'reports', title: 'Understanding reports', items: [
    { id: 'reports-about', q: 'What do the Reports show?', keys: 'chart monthly summary average net share table compare',
      p: ['Pick a month at the top of Reports. You will see the net change, income and expenses for that month and your average monthly expenses over the months shown. A chart compares income and expenses month by month, covering up to six months that end with the month you picked.',
        'Where the money went shows each expense category as a share of that month\u2019s spending, a table lists the figures month by month, and a short note compares your spending with the previous month.'],
      links: [{ to: '/reports', label: 'Open Reports' }] },
    { id: 'reports-empty', q: 'Why are my Reports empty?', keys: 'no data',
      p: ['Reports need transactions to work with. Once you add your first transaction, the figures and charts fill in.'],
      links: [{ to: '/transactions/new', label: 'Add a transaction' }] },
  ] },

  { id: 'account', title: 'Profile and account', items: [
    { id: 'edit-profile', q: 'How do I change my name or email?', keys: 'account details confirm verify',
      p: ['Open Profile and choose Edit profile. If you change your email address, check your inbox afterwards to confirm the new address.'],
      links: [{ to: '/profile', label: 'Open Profile' }] },
    { id: 'password', q: 'How do I change my password?', keys: 'security reset sign in',
      p: ['Open Profile (or Settings, under Account) and choose Change password. Enter your current password, then a new one with at least 8 characters, and confirm it. If you have forgotten your password, use Forgot password on the log in page.'],
      links: [{ to: '/profile?password=1', label: 'Change password' }] },
    { id: 'avatar', q: 'How do I add or remove a profile picture?', keys: 'photo avatar image',
      p: ['On Profile, use the pencil button on your picture to add, change or delete it. Use a JPG, PNG or WebP photo up to 10 MB and at least 64 by 64 pixels. It is cropped to a square, and it is not shown to other users.'] },
    { id: 'logout', q: 'How do I log out?', keys: 'sign out',
      p: ['Choose Log out from your account menu, or use the Log out button at the bottom of Settings.'] },
    { id: 'delete-account', q: 'How do I delete my account?', keys: 'close remove permanently danger',
      p: ['In Settings, under Danger zone, choose Delete account and type DELETE to confirm. This permanently removes your profile, profile picture, transactions, budgets, categories, savings goals and transfers and cannot be undone. If you want a copy of your transactions, export them first.'],
      links: [{ to: '/settings', label: 'Open Settings' }], see: ['export'] },
  ] },

  { id: 'preferences', title: 'Currency and preferences', items: [
    { id: 'currency', q: 'How do I change the currency?', keys: 'peso dollar euro symbol php usd convert',
      p: ['Open Settings, find Preferences and pick a currency. There are 16 to choose from, including PHP, USD, EUR, GBP, JPY and SGD. This only changes the symbol and format used for amounts. Your amounts are not converted.'],
      links: [{ to: '/settings', label: 'Open Settings' }], see: ['ts-currency'] },
    { id: 'theme', q: 'How do I switch between light and dark?', keys: 'appearance mode night',
      p: ['Open Settings, find Preferences and set Theme to Light or Dark.'],
      links: [{ to: '/settings', label: 'Open Settings' }] },
  ] },

  { id: 'troubleshooting', title: 'Troubleshooting', items: [
    { id: 'ts-load', q: 'I see \u201cUnable to load your data\u201d', keys: 'error connection offline retry loading',
      p: ['Check your internet connection and choose Try again. If it keeps happening, log out, log back in and try once more.'] },
    { id: 'ts-missing-tx', q: 'I can\u2019t see a transaction I added', keys: 'missing not showing filter month',
      p: ['The Transactions list starts with the current month. If the date was in another month, open Filter and choose All dates, or choose Reset. Also check that the Type and Category filters are not narrowing the list.'], see: ['search-filter'] },
    { id: 'ts-budget-exists', q: '\u201cThis category already has a budget for that month\u201d', keys: 'duplicate error budget exists',
      p: ['Only one budget is allowed for each category in a month. Open Budgets, pick that month, and use Edit budget on the existing one instead.'], see: ['create-budget'] },
    { id: 'ts-currency', q: 'My amounts look different after changing currency', keys: 'convert exchange rate wrong',
      p: ['Changing the currency changes the symbol only. The numbers stay exactly as you entered them, so TrackMyKita does not convert between currencies.'] },
    { id: 'ts-contact', q: 'How do I contact support?', keys: 'email help problem report bug version update log contact',
      p: ['Email us and we will get back to you. The About page also shows your current version and the update log, which is useful to mention.'],
      mail: true, links: [{ to: '/settings/about', label: 'Open About' }] },
  ] },
]

export const HELP_ITEMS = HELP.flatMap((g) => g.items.map((it) => ({ ...it, group: g.id, groupTitle: g.title })))
export const helpText = (it) => [it.q, it.groupTitle, it.keys, ...(it.p || []), ...(it.steps || [])].join(' ').toLowerCase()
