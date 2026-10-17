import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { PRESETS, PRESET_EXPENSE, PRESET_INCOME, sortCategories } from './presetCategories.js'

const iconSrc = readFileSync(new URL('../utils/icons.js', import.meta.url), 'utf8')
const iconIds = [...iconSrc.matchAll(/\['([a-z0-9-]+)', '[^']+', [A-Za-z0-9]+, '[^']+'\]/g)].map((m) => m[1])
const colorSrc = readFileSync(new URL('../utils/colors.js', import.meta.url), 'utf8')
const colorKeys = [...colorSrc.matchAll(/\['([a-z]+)', '[A-Za-z]+', '#[0-9A-Fa-f]{6}'\]/g)].map((m) => m[1])

test('19 expense and 19 income presets with the requested names, in order', () => {
  assert.equal(PRESET_EXPENSE.length, 19)
  assert.equal(PRESET_INCOME.length, 19)
  assert.deepEqual(PRESET_EXPENSE.map((p) => p.name), ['Housing & Rent', 'Bills & Utilities', 'Groceries', 'Food & Dining', 'Transportation', 'Shopping', 'Health & Medical', 'Personal Care', 'Education', 'Entertainment', 'Travel', 'Family & Kids', 'Pets', 'Insurance', 'Debt & Loans', 'Subscriptions', 'Gifts & Donations', 'Fees & Charges', 'Other Expenses'])
  assert.deepEqual(PRESET_INCOME.map((p) => p.name), ['Salary & Wages', 'Freelance & Contract', 'Business Income', 'Bonuses', 'Commissions', 'Tips', 'Investment Returns', 'Interest', 'Dividends', 'Rental Income', 'Sale of Items', 'Refunds & Reimbursements', 'Gifts', 'Allowance', 'Pension & Retirement', 'Benefits & Assistance', 'Royalties', 'Awards & Prizes', 'Other Income'])
})
test('keys are unique, stable and typed', () => {
  assert.equal(new Set(PRESETS.map((p) => p.key)).size, 38)
  assert.equal(PRESETS[0].key, 'expense:housing-rent')
  assert.equal(PRESET_INCOME[11].key, 'income:refunds-reimbursements')
  for (const p of PRESETS) assert.match(p.key, /^(income|expense):[a-z0-9]+(-[a-z0-9]+)*$/)
})
test('every preset has a dedicated icon that exists in the icon library, and a valid color', () => {
  for (const p of PRESETS) {
    assert.ok(iconIds.includes(p.icon), `${p.name}: unknown icon ${p.icon}`)
    assert.ok(colorKeys.includes(p.color), `${p.name}: unknown color ${p.color}`)
  }
})
test('the icon library offers at least 80 distinct icons with unique ids', () => {
  assert.ok(iconIds.length >= 80, `only ${iconIds.length}`)
  assert.equal(new Set(iconIds).size, iconIds.length)
  for (const id of iconIds) assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)*$/)
})
test('the database provisioning function lists exactly the same presets', () => {
  const dir = new URL('../../supabase/migrations/', import.meta.url)
  const file = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort().reverse().find((f) => readFileSync(new URL(f, dir), 'utf8').includes('kita_provision_categories'))
  assert.ok(file, 'migration with kita_provision_categories not found')
  const sql = readFileSync(new URL(file, dir), 'utf8')
  const rows = [...sql.matchAll(/\('(income|expense)', '([a-z0-9:-]+)', '((?:[^']|'')+)', '([a-z0-9-]+)', '([a-z]+)'\)/g)].map((m) => ({ type: m[1], key: m[2], name: m[3].replace(/''/g, "'"), icon: m[4], color: m[5] }))
  assert.equal(rows.length, 38)
  assert.deepEqual(rows, PRESETS.map(({ type, key, name, icon, color }) => ({ type, key, name, icon, color })))
})
test('presets come first in their original order, then custom categories oldest to newest', () => {
  const list = [
    { id: 'c2', name: 'Custom B', createdAt: '2026-10-03T00:00:00Z', presetKey: null },
    { id: 'p3', name: 'Groceries', createdAt: '2026-10-01T00:00:00Z', presetKey: 'expense:groceries' },
    { id: 'c1', name: 'Custom A', createdAt: '2026-01-01T00:00:00Z', presetKey: null },
    { id: 'p1', name: 'Housing & Rent', createdAt: '2026-10-01T00:00:00Z', presetKey: 'expense:housing-rent' },
  ]
  assert.deepEqual(sortCategories(list).map((c) => c.id), ['p1', 'p3', 'c1', 'c2'])
})
test('no imported icon shadows a JavaScript global (a lucide "Map" import once broke new Map())', () => {
  const imported = iconSrc.match(/import \{([^}]*)\} from 'lucide-react'/)[1].split(',').map((x) => x.trim()).filter(Boolean).map((x) => x.split(/\s+as\s+/).pop())
  for (const name of imported) assert.equal(name in globalThis, false, `${name} shadows a global`)
})
test('every icon id maps to a real lucide-react export (runs once dependencies are installed: npm install && npm test)', async (t) => {
  const { createRequire } = await import('node:module')
  let lucide
  try { lucide = createRequire(import.meta.url)('lucide-react') } catch { return t.skip('lucide-react is not installed in this environment') }
  const names = [...iconSrc.matchAll(/\['[a-z0-9-]+', '[^']+', ([A-Za-z0-9]+), '[^']+'\]/g)].map((m) => m[1].replace(/^MapIcon$/, 'Map'))
  const missing = names.filter((n) => !(n in lucide))
  assert.deepEqual(missing, [], `these icons do not exist in the installed lucide-react: ${missing.join(', ')}`)
})
