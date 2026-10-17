// Backup file format (TrackMyKita backup, version 1) and its validation. Pure functions: no network, no storage.
//
//   {
//     "format": "trackmykita-backup", "version": 1, "appVersion": "1.3.4", "exportedAt": "<ISO timestamp>",
//     "profile": { "currency": "PHP" },
//     "categories": [{ id, name, type, color, icon, preset_key, archived_at, created_at }],
//     "budgets": [{ id, category_id | null, name | null, icon | null, amount, month, created_at }],
//     "transactions": [{ id, category_id | null, amount, type, description | null, transaction_date, notes | null, balance, goal_id | null, created_at }],
//     "savings_goals": [{ id, name, target_amount, archived_at | null, created_at }],
//     "savings_transfers": [{ id, direction, amount, transfer_date, note | null, goal_id | null, created_at }],
//     "savings_reallocations": [{ id, from_goal_id | null, to_goal_id | null, amount, allocation_date, note | null, created_at }],
//     "counts": { <section>: <number> }
//   }
//
// Ids exist only to link records inside the file; the database gives every restored record a new id. The file has NO user id, email, password,
// token or key, and restoring ignores anything that is not listed above. Profile pictures are stored separately and are NOT in the backup.
import { computeLedger, ledgerProblem } from './ledger.js'
import { CURRENCY_CODES } from './currency.js'
import { isDay } from './dateRange.js'

export const BACKUP_FORMAT = 'trackmykita-backup'
export const BACKUP_VERSION = 1
export const MAX_BACKUP_BYTES = 25 * 1024 * 1024
export const SECTIONS = ['categories', 'budgets', 'transactions', 'savings_goals', 'savings_transfers', 'savings_reallocations']
export const SECTION_LABELS = { categories: 'Categories', budgets: 'Budgets', transactions: 'Transactions', savings_goals: 'Savings goals', savings_transfers: 'Savings transfers', savings_reallocations: 'Savings re-allocations' }
const COLORS = ['green', 'amber', 'brick', 'slate', 'grey', 'red', 'orange', 'yellow', 'blue', 'cyan', 'teal', 'purple', 'violet', 'pink', 'brown', 'gray']
const MAX_CENTS = 99999999999999
const ICON_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const PRESET_RE = /^(income|expense):[a-z0-9]+(-[a-z0-9]+)*$/

export const backupFilename = (d = new Date()) => `TrackMyKita-Backup-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`

// `data` is what the database function export_my_data() returned (already limited to the signed-in user's own records).
export function buildBackup(data, appVersion, now = new Date()) {
  const out = { format: BACKUP_FORMAT, version: BACKUP_VERSION, appVersion: String(appVersion), exportedAt: now.toISOString(), profile: { currency: data?.profile?.currency ?? null } }
  for (const s of SECTIONS) out[s] = Array.isArray(data?.[s]) ? data[s] : []
  out.counts = Object.fromEntries(SECTIONS.map((s) => [s, out[s].length]))
  return out
}
export const backupToText = (backup) => JSON.stringify(backup, null, 2)

class Bad extends Error {}
const bad = (m) => { throw new Bad(m) }
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const str = (v) => typeof v === 'string'
const iso = (v) => str(v) && v.length >= 10 && !Number.isNaN(Date.parse(v))
const optIso = (v) => v === null || v === undefined || v === '' || iso(v)
const cents = (n) => Math.round(n * 100)
function money(v, where) {
  if (typeof v !== 'number' || !Number.isFinite(v)) bad(`${where}: the amount is not a number.`)
  if (Math.abs(cents(v) - v * 100) > 1e-6) bad(`${where}: the amount has more than 2 decimal places.`)
  if (!(v > 0)) bad(`${where}: the amount must be above zero.`)
  if (cents(v) > MAX_CENTS) bad(`${where}: the amount is too large.`)
}
const oneOf = (v, list, where) => { if (!list.includes(v)) bad(`${where} has an unexpected value.`) }
const optText = (v) => (v === null || v === undefined || v === '' ? null : String(v))

// Checks everything the database would check, plus references and the savings ledger, WITHOUT touching any data.
// Returns { ok: true, payload, counts } (payload = the sanitised object to send to restore_user_data) or { ok: false, error }.
export function validateBackup(input) {
  try {
    if (!isObj(input) || input.format !== BACKUP_FORMAT) bad('This file is not a TrackMyKita backup.')
    if (input.version !== BACKUP_VERSION) bad(input.version > BACKUP_VERSION ? 'This backup was made by a newer version of TrackMyKita and cannot be restored here.' : 'This backup uses a format that is no longer supported.')
    for (const s of SECTIONS) { if (!Array.isArray(input[s])) bad(`This backup is damaged: the ${SECTION_LABELS[s].toLowerCase()} section is missing.`); if (input[s].length > 200000) bad('This backup is too large to restore.') }
    const ids = {}
    const unique = (section, id, where) => { if (!str(id) || !id) bad(`${where}: a record has no id.`); const seen = (ids[section] ||= new Set()); if (seen.has(id)) bad(`${where}: the same record appears twice.`); seen.add(id) }

    const categories = input.categories.map((c, i) => {
      const w = `Category ${i + 1}`
      if (!isObj(c)) bad(`${w} is unreadable.`)
      unique('categories', c.id, w)
      if (!str(c.name) || !c.name.trim()) bad(`${w} has no name.`)
      if (c.name.trim().length > 100) bad(`${w}: the name is too long.`)
      oneOf(c.type, ['income', 'expense'], `${w}: the type`)
      const color = c.color ?? 'grey'; oneOf(color, COLORS, `${w}: the color`)
      if (c.icon != null && c.icon !== '' && !(str(c.icon) && ICON_RE.test(c.icon) && c.icon.length <= 40)) bad(`${w}: the icon is invalid.`)
      if (c.preset_key != null && c.preset_key !== '') { if (!(str(c.preset_key) && PRESET_RE.test(c.preset_key) && c.preset_key.split(':')[0] === c.type)) bad(`${w}: the preset reference is invalid.`) }
      if (!optIso(c.archived_at) || !optIso(c.created_at)) bad(`${w}: a date is invalid.`)
      return { id: c.id, name: c.name.trim(), type: c.type, color, icon: optText(c.icon), preset_key: optText(c.preset_key), archived_at: optText(c.archived_at), created_at: optText(c.created_at) }
    })
    const catById = new Map(categories.map((c) => [c.id, c]))
    const activeNames = new Set()
    for (const c of categories) { if (c.archived_at) continue; const k = `${c.type}\u0000${c.name}`; if (activeNames.has(k)) bad(`Two active ${c.type} categories are both called "${c.name}".`); activeNames.add(k) }
    const presetKeys = new Set()
    for (const c of categories) { if (!c.preset_key) continue; if (presetKeys.has(c.preset_key)) bad('A built-in category appears twice.'); presetKeys.add(c.preset_key) }

    const goals = input.savings_goals.map((g, i) => {
      const w = `Savings goal ${i + 1}`
      if (!isObj(g)) bad(`${w} is unreadable.`)
      unique('savings_goals', g.id, w)
      if (!str(g.name) || !g.name.trim() || g.name.length > 60) bad(`${w} has an invalid name.`)
      money(g.target_amount, `${w} target`)
      if (!optIso(g.archived_at) || !optIso(g.created_at)) bad(`${w}: a date is invalid.`)
      return { id: g.id, name: g.name, target_amount: g.target_amount, archived_at: optText(g.archived_at), created_at: optText(g.created_at) }
    })
    const goalIds = new Set(goals.map((g) => g.id))
    const needGoal = (id, w) => { if (id != null && id !== '' && !goalIds.has(id)) bad(`${w} points at a savings goal that is not in the backup.`) }

    const budgetKeys = new Set()
    const budgets = input.budgets.map((b, i) => {
      const w = `Budget ${i + 1}`
      if (!isObj(b)) bad(`${w} is unreadable.`)
      unique('budgets', b.id, w); money(b.amount, w)
      if (!str(b.month) || !isDay(b.month.slice(0, 10)) || b.month.slice(8, 10) !== '01') bad(`${w}: the month is invalid.`)
      const cid = optText(b.category_id), name = optText(b.name)
      if (cid) { const c = catById.get(cid); if (!c) bad(`${w} points at a category that is not in the backup.`); if (c.type !== 'expense') bad(`${w} is linked to a category that is not an expense category.`) }
      else if (!name || !name.trim()) bad(`${w} has neither a category nor a name.`)
      if (name != null && (!name.trim() || name.trim().length > 40)) bad(`${w}: the name is invalid.`)
      if (b.icon != null && b.icon !== '' && !(str(b.icon) && ICON_RE.test(b.icon) && b.icon.length <= 40)) bad(`${w}: the icon is invalid.`)
      const key = cid ? `c:${cid}:${b.month}` : `n:${name.trim().toLowerCase()}:${b.month}`
      if (budgetKeys.has(key)) bad(`${w}: there are two budgets for the same category and month.`); budgetKeys.add(key)
      if (!optIso(b.created_at)) bad(`${w}: a date is invalid.`)
      return { id: b.id, category_id: cid, name: name ? name.trim() : null, icon: optText(b.icon), amount: b.amount, month: b.month.slice(0, 10), created_at: optText(b.created_at) }
    })

    const transactions = input.transactions.map((t, i) => {
      const w = `Transaction ${i + 1}`
      if (!isObj(t)) bad(`${w} is unreadable.`)
      unique('transactions', t.id, w); money(t.amount, w)
      oneOf(t.type, ['income', 'expense'], `${w}: the type`)
      if (!str(t.transaction_date) || !isDay(t.transaction_date.slice(0, 10))) bad(`${w}: the date is invalid.`)
      const balance = t.balance ?? 'current'; oneOf(balance, ['current', 'savings'], `${w}: the balance`)
      const cid = optText(t.category_id), gid = optText(t.goal_id)
      if (cid) { const c = catById.get(cid); if (!c) bad(`${w} points at a category that is not in the backup.`); if (c.type !== t.type) bad(`${w} has a different type from its category.`) }
      needGoal(gid, w); if (gid && balance !== 'savings') bad(`${w} has a savings goal but is not a Savings transaction.`)
      if (t.description != null && t.description !== '' && !str(t.description)) bad(`${w}: the title is invalid.`)
      if (!optIso(t.created_at)) bad(`${w}: a date is invalid.`)
      return { id: t.id, category_id: cid, amount: t.amount, type: t.type, description: optText(t.description), transaction_date: t.transaction_date.slice(0, 10), notes: optText(t.notes), balance, goal_id: gid, created_at: optText(t.created_at) }
    })

    const transfers = input.savings_transfers.map((s, i) => {
      const w = `Savings transfer ${i + 1}`
      if (!isObj(s)) bad(`${w} is unreadable.`)
      unique('savings_transfers', s.id, w); money(s.amount, w); oneOf(s.direction, ['to_savings', 'to_current'], `${w}: the direction`)
      if (!str(s.transfer_date) || !isDay(s.transfer_date.slice(0, 10))) bad(`${w}: the date is invalid.`)
      const gid = optText(s.goal_id); needGoal(gid, w)
      if (!optIso(s.created_at)) bad(`${w}: a date is invalid.`)
      return { id: s.id, direction: s.direction, amount: s.amount, transfer_date: s.transfer_date.slice(0, 10), note: optText(s.note), goal_id: gid, created_at: optText(s.created_at) }
    })

    const reallocations = input.savings_reallocations.map((r, i) => {
      const w = `Savings re-allocation ${i + 1}`
      if (!isObj(r)) bad(`${w} is unreadable.`)
      unique('savings_reallocations', r.id, w); money(r.amount, w)
      if (!str(r.allocation_date) || !isDay(r.allocation_date.slice(0, 10))) bad(`${w}: the date is invalid.`)
      const from = optText(r.from_goal_id), to = optText(r.to_goal_id); needGoal(from, w); needGoal(to, w)
      if (from === to) bad(`${w} moves money to the same place it came from.`)
      if (!optIso(r.created_at)) bad(`${w}: a date is invalid.`)
      return { id: r.id, from_goal_id: from, to_goal_id: to, amount: r.amount, allocation_date: r.allocation_date.slice(0, 10), note: optText(r.note), created_at: optText(r.created_at) }
    })

    // The same savings rule the database enforces: no goal and no General Savings below zero, and a deleted goal holds nothing.
    const ledger = computeLedger({
      transactions: transactions.map((t) => ({ amount: t.amount, type: t.type, balance: t.balance, goalId: t.goal_id || '' })),
      transfers: transfers.map((t) => ({ amount: t.amount, direction: t.direction, goalId: t.goal_id || '' })),
      reallocations: reallocations.map((r) => ({ amount: r.amount, fromGoalId: r.from_goal_id || '', toGoalId: r.to_goal_id || '' })),
      goals: goals.map((g) => ({ id: g.id })),
    })
    const problem = ledgerProblem(ledger, goals.map((g) => ({ id: g.id, name: g.name, archived: !!g.archived_at })))
    if (problem) bad(`The savings in this backup do not add up. ${problem}`)

    let currency = null
    if (input.profile != null) {
      if (!isObj(input.profile)) bad('This backup is damaged: the settings section is unreadable.')
      if (input.profile.currency != null && input.profile.currency !== '') { if (!CURRENCY_CODES.includes(input.profile.currency)) bad('The currency in this backup is not supported.'); currency = input.profile.currency }
    }
    const payload = { format: BACKUP_FORMAT, version: BACKUP_VERSION, profile: { currency }, categories, budgets, transactions, savings_goals: goals, savings_transfers: transfers, savings_reallocations: reallocations }
    const counts = Object.fromEntries(SECTIONS.map((s) => [s, payload[s].length]))
    return { ok: true, payload, counts, meta: { appVersion: str(input.appVersion) ? input.appVersion.slice(0, 20) : '', exportedAt: iso(input.exportedAt) ? input.exportedAt : '', currency } }
  } catch (e) {
    if (e instanceof Bad) return { ok: false, error: e.message }
    return { ok: false, error: 'This file could not be read as a TrackMyKita backup.' }
  }
}

// Text of a chosen file -> validation result. Never throws.
export function parseBackupText(text) {
  if (typeof text !== 'string' || !text.trim()) return { ok: false, error: 'The file is empty.' }
  if (text.length > MAX_BACKUP_BYTES) return { ok: false, error: 'This file is too large to be a TrackMyKita backup.' }
  let data
  try { data = JSON.parse(text.replace(/^\uFEFF/, '')) } catch { return { ok: false, error: 'This file is not a TrackMyKita backup. It could not be read.' } }
  return validateBackup(data)
}
