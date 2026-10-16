// Two-balance ledger (Current Balance + Savings). Pure functions, no imports: every screen derives its figures from here, so the dashboard,
// the Savings page and the forms can never disagree. Arithmetic is done in integer cents to avoid floating-point drift.
//
//   Current balance = income(current) - expenses(current) + transfers to current - transfers to savings
//   Savings balance = income(savings) - expenses(savings) + transfers to savings - transfers to current
//   A goal's amount = the Savings flows tagged with that goal, +/- reallocations. "General" (unassigned) = the flows with no goal.
//   Goals only earmark Savings: allocated + unassigned = Savings, so goals are never extra money.
// Transfers and reallocations are NOT income or expenses and are never passed to the income/expense reports (utils/calc.js).
const cents = (n) => Math.round(Number(n) * 100)
export const toMoney = (n) => Math.round(Number(n) * 100) / 100 // 2-decimal amount for storing/sending
export const isSavings = (t) => t?.balance === 'savings' // rows saved before 1.3.1 have no balance and are Current Balance

export function computeLedger({ transactions = [], transfers = [], reallocations = [], goals = [] } = {}) {
  let current = 0, general = 0
  const by = {}
  goals.forEach((g) => { by[g.id] = 0 })
  const bump = (goalId, d) => { if (goalId) by[goalId] = (by[goalId] || 0) + d; else general += d }
  for (const t of transactions) {
    const a = cents(t.amount) * (t.type === 'income' ? 1 : -1)
    if (isSavings(t)) bump(t.goalId, a); else current += a
  }
  for (const t of transfers) {
    const a = cents(t.amount)
    if (t.direction === 'to_savings') { current -= a; bump(t.goalId, a) } else { current += a; bump(t.goalId, -a) }
  }
  for (const r of reallocations) { const a = cents(r.amount); bump(r.fromGoalId, -a); bump(r.toGoalId, a) }
  const goalSum = Object.values(by).reduce((s, v) => s + v, 0)
  return {
    current: current / 100,
    savings: (general + goalSum) / 100,
    unassigned: general / 100,
    allocated: goalSum / 100,
    goals: Object.fromEntries(Object.entries(by).map(([k, v]) => [k, v / 100])),
  }
}

// Money available in one bucket: a goal id, or '' / null for General (unassigned) Savings.
export const bucketAmount = (ledger, goalId) => (goalId ? ledger.goals[goalId] ?? 0 : ledger.unassigned)

// First thing wrong with a ledger, or null. Mirrors the database check (no goal and no General Savings below zero, deleted goals stay empty).
// This is only an early, friendly message: the database re-checks every write under a per-user lock and is the authority.
export function ledgerProblem(ledger, goals = []) {
  if (ledger.unassigned < 0) return `There is not enough unassigned Savings for this. Choose a goal that has enough saved, or move more money to Savings first.`
  const bad = goals.find((g) => (ledger.goals[g.id] ?? 0) < 0)
  if (bad) return `"${bad.name}" would be left with less than zero saved. Reduce the amount, or move money into that goal first.`
  const dead = goals.find((g) => g.archived && (ledger.goals[g.id] ?? 0) !== 0) // a deleted goal must stay empty
  return dead ? `"${dead.name}" was deleted, so it cannot hold money. This change would leave it with a balance.` : null
}

// Target / saved / remaining / progress for one goal. Saved is never taken from the target, and a goal with nothing allocated shows 0.
export function goalProgress(goal, saved) {
  const s = Math.max(0, Number(saved) || 0), target = Number(goal.target) || 0
  return { saved: s, target, remaining: Math.max(0, toMoney(target - s)), pct: target > 0 ? Math.min(100, (s / target) * 100) : 0, reached: target > 0 && s >= target }
}
export const pctText = (pct) => `${Number(pct.toFixed(1))}%`

// ---- One transfer form for every movement of money (Savings > Add money) ----
// A "place" is Current Balance, General Savings (unassigned) or one active goal (its id). The same ledger tables as before do the work, nothing new:
//   Current Balance -> General Savings / goal   savings_transfers  to_savings (goal NULL = General)
//   General Savings / goal -> Current Balance   savings_transfers  to_current (goal NULL = General)
//   General Savings / goal -> General / goal    savings_reallocations (goal NULL = General)
// None of them is income or an expense. The database re-checks every one under its per-user lock; the checks here only give an early, clear message.
export const CURRENT = 'current', GENERAL = 'general'
const goalOf = (place) => (place === GENERAL ? '' : place)
// Add money opened from a goal (or from General Savings, goalId '') pays from Current Balance into that place.
export const transferDefaults = (goalId = '') => ({ from: CURRENT, to: goalId || GENERAL })
export const placeAmount = (ledger, place) => (place === CURRENT ? ledger.current : place === GENERAL ? ledger.unassigned : ledger.goals[place] ?? 0)
// Which database write a (from, to) pair needs, or null when the pair makes no sense (same place twice).
export function transferPlan(from, to) {
  if (!from || !to || from === to) return null
  if (from === CURRENT) return { kind: 'transfer', direction: 'to_savings', goalId: goalOf(to) }
  if (to === CURRENT) return { kind: 'transfer', direction: 'to_current', goalId: goalOf(from) }
  return { kind: 'move', fromGoalId: goalOf(from), toGoalId: goalOf(to) }
}
// First problem with a requested transfer as { field, message }, or null. `activeGoals` are the goals that may be used (deleted goals are not in it).
export function transferProblem(ledger, activeGoals, { from, to, amount }, fmt = (n) => String(n)) {
  const known = (p) => p === CURRENT || p === GENERAL || activeGoals.some((g) => g.id === p)
  const name = (p) => (p === CURRENT ? 'Current Balance' : p === GENERAL ? 'General Savings' : activeGoals.find((g) => g.id === p)?.name || 'That goal')
  if (!known(from)) return { field: 'from', message: 'Choose where the money comes from. That goal may have been deleted.' }
  if (!known(to)) return { field: 'to', message: 'Choose where the money goes. That goal may have been deleted.' }
  if (from === to) return { field: 'to', message: 'Choose a different place to move the money to.' }
  const raw = typeof amount === 'string' ? amount.trim() : amount
  if (raw === '' || raw == null || !Number.isFinite(Number(raw))) return { field: 'amount', message: 'Enter an amount.' }
  const amt = toMoney(raw)
  if (!(amt > 0)) return { field: 'amount', message: 'Enter an amount above zero.' }
  const have = placeAmount(ledger, from)
  if (cents(amt) > cents(have)) return { field: 'amount', message: `${name(from)} only has ${fmt(Math.max(0, have))} available. Enter a smaller amount.` }
  return null
}
