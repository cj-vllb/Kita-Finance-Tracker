// In-app notification center. Notifications are DERIVED from data the app already holds (budgets, transactions, savings goals) and from the
// release notes, so nothing is written to the database and no notification is created while a page renders. Every notification has a stable
// id built from the thing it is about and the level it reached (for example "budget:<id>:over"), which is what makes "unchanged condition,
// no repeat" true: the same condition is always the same id, and a new level (80% -> over) is a genuinely new id.
// Read/unread is remembered per user on this device only (utils/notificationState.js); no financial data is stored there, only ids.
import { bucketAmount } from './ledger.js'

export const GOAL_MILESTONES = [25, 50, 75, 100]
const cents = (n) => Math.round(Number(n) * 100)
const latest = (dates) => dates.filter(Boolean).sort().pop() || null

// month: 'YYYY-MM' of the budgets to check (this month). Budget-only budgets (no category) track no spending, so they never alert.
export function budgetNotifications({ budgets = [], transactions = [], categories = [], month }, fmt = String) {
  const out = []
  for (const b of budgets) {
    if (b.month !== month || !b.categoryId || !(b.amount > 0)) continue
    const used = transactions.filter((t) => t.type === 'expense' && t.categoryId === b.categoryId && t.date.startsWith(month))
    const spent = used.reduce((s, t) => s + cents(t.amount), 0), limit = cents(b.amount), name = b.name || categories.find((c) => c.id === b.categoryId)?.name || 'This'
    const level = spent > limit ? 'over' : spent === limit ? 'reached' : spent * 100 >= limit * 80 ? 'approaching' : null
    if (!level) continue
    const pct = Math.round((spent / limit) * 100), at = latest(used.map((t) => t.date))
    const text = {
      approaching: { title: `${name} budget is nearly used`, message: `You have used ${pct}% of this month's budget (${fmt(spent / 100)} of ${fmt(limit / 100)}).` },
      reached: { title: `${name} budget limit reached`, message: `You have spent all of this month's ${fmt(limit / 100)}.` },
      over: { title: `${name} budget exceeded`, message: `You are ${fmt((spent - limit) / 100)} over this month's ${fmt(limit / 100)} budget.` },
    }[level]
    out.push({ id: `budget:${b.id}:${level}`, kind: 'budget', level, to: '/budgets', at, ...text })
  }
  return out
}

// A goal's notification is the HIGHEST milestone it has reached right now, based on the money actually in it.
export function savingsNotifications({ goals = [], ledger, transfers = [], contributions = [], reallocations = [], transactions = [] }, fmt = String) {
  const out = []
  for (const g of goals) {
    if (g.archived || !(g.target > 0)) continue
    const saved = bucketAmount(ledger, g.id), pct = (saved / g.target) * 100, hit = GOAL_MILESTONES.filter((m) => pct >= m).pop()
    if (!hit) continue
    const at = latest([
      ...transfers.filter((t) => t.goalId === g.id).map((t) => t.date), ...contributions.filter((k) => k.goalId === g.id).map((k) => k.date),
      ...reallocations.filter((r) => r.toGoalId === g.id || r.fromGoalId === g.id).map((r) => r.date), ...transactions.filter((t) => t.balance === 'savings' && t.goalId === g.id).map((t) => t.date),
    ])
    out.push(hit === 100
      ? { id: `goal:${g.id}:100`, kind: 'savings', level: 'done', to: '/savings', at, title: `${g.name} goal completed`, message: `You have saved ${fmt(saved)}, which reaches your ${fmt(g.target)} target.` }
      : { id: `goal:${g.id}:${hit}`, kind: 'savings', level: 'progress', to: '/savings', at, title: `${g.name} is ${hit}% saved`, message: `${fmt(saved)} of ${fmt(g.target)} saved so far.` })
  }
  return out
}

// System: the newest release note, taken from the app's own changelog (no network, nothing invented).
export function systemNotifications(changelog = []) {
  const r = changelog[0]; if (!r) return []
  return [{ id: `release:${r.version}`, kind: 'system', level: 'info', to: '/settings/about', at: null, dateText: r.date || '', title: `What's new in ${r.version}`, message: r.title }]
}

export function buildNotifications({ budgets, transactions, categories, goals, ledger, transfers, contributions, reallocations, changelog, month }, fmt) {
  const list = [
    ...budgetNotifications({ budgets, transactions, categories, month }, fmt),
    ...savingsNotifications({ goals, ledger, transfers, contributions, reallocations, transactions }, fmt),
    ...systemNotifications(changelog),
  ]
  // Newest activity first; ones without a date (the release note) go last.
  return list.sort((a, b) => (b.at || '').localeCompare(a.at || '') || a.id.localeCompare(b.id))
}
