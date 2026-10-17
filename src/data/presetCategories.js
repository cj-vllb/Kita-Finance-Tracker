// Built-in category presets. These are the ORIGINAL definitions: a user's edits change only that user's own rows, never this list.
// The same list (keys, names, icons, colors) is in the database function kita_provision_categories (migration 20261016000000), which creates
// each user's own copy once. `src/data/presetCategories.test.js` fails if the two ever differ.
// `key` is stored in categories.preset_key so a renamed preset is still recognised (and is never created twice).
const slug = (s) => s.toLowerCase().replace(/&/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const make = (type, rows) => rows.map(([name, icon, color]) => ({ key: `${type}:${slug(name)}`, type, name, icon, color }))

export const PRESET_EXPENSE = make('expense', [
  ['Housing & Rent', 'home', 'blue'], ['Bills & Utilities', 'zap', 'yellow'], ['Groceries', 'shopping-cart', 'green'], ['Food & Dining', 'utensils', 'orange'],
  ['Transportation', 'car', 'cyan'], ['Shopping', 'shopping-bag', 'pink'], ['Health & Medical', 'stethoscope', 'red'], ['Personal Care', 'scissors', 'purple'],
  ['Education', 'graduation-cap', 'violet'], ['Entertainment', 'film', 'purple'], ['Travel', 'plane', 'teal'], ['Family & Kids', 'baby', 'pink'],
  ['Pets', 'paw-print', 'brown'], ['Insurance', 'shield-check', 'blue'], ['Debt & Loans', 'landmark', 'red'], ['Subscriptions', 'repeat', 'violet'],
  ['Gifts & Donations', 'gift', 'pink'], ['Fees & Charges', 'receipt', 'grey'], ['Other Expenses', 'tags', 'grey'],
])
export const PRESET_INCOME = make('income', [
  ['Salary & Wages', 'banknote', 'green'], ['Freelance & Contract', 'laptop', 'teal'], ['Business Income', 'briefcase', 'blue'], ['Bonuses', 'award', 'yellow'],
  ['Commissions', 'percent', 'orange'], ['Tips', 'coins', 'yellow'], ['Investment Returns', 'trending-up', 'green'], ['Interest', 'piggy-bank', 'cyan'],
  ['Dividends', 'dollar-sign', 'teal'], ['Rental Income', 'building-2', 'brown'], ['Sale of Items', 'tag', 'orange'], ['Refunds & Reimbursements', 'refresh-cw', 'blue'],
  ['Gifts', 'gift', 'pink'], ['Allowance', 'wallet', 'violet'], ['Pension & Retirement', 'umbrella', 'cyan'], ['Benefits & Assistance', 'heart-handshake', 'red'],
  ['Royalties', 'book-open', 'purple'], ['Awards & Prizes', 'trophy', 'yellow'], ['Other Income', 'box', 'grey'],
])
export const PRESETS = [...PRESET_EXPENSE, ...PRESET_INCOME]
const ORDER = new Map(PRESETS.map((p, i) => [p.key, i]))
export const presetByKey = (key) => PRESETS.find((p) => p.key === key) || null
export const presetOrder = (key) => (ORDER.has(key) ? ORDER.get(key) : Infinity)

// Presets first, in their original order, then custom categories in the order they were created (newest last).
export const sortCategories = (list) => [...list].sort((a, b) => {
  const pa = presetOrder(a.presetKey), pb = presetOrder(b.presetKey)
  if (pa !== pb) return pa < pb ? -1 : 1
  return (a.createdAt || '').localeCompare(b.createdAt || '') || String(a.id).localeCompare(String(b.id))
})
