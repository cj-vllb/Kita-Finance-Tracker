// Pure report calculations for the Reports page. Every figure comes from the rows passed in; nothing is invented.
// Income and expenses are summed from TRANSACTIONS only (type 'income' / 'expense'). Savings transfers and reallocations are separate tables and are
// never passed to the income/expense functions, so moving money between Current Balance, Savings and goals can never count as income or spending.
// Money is added in integer cents, so totals and category shares agree exactly.
import { inPeriod, periodRange, addDays, monthTitle, shiftMonthStr, parseDay, weekdayName, MONTHS } from './dateRange.js'
const cents = (n) => Math.round(Number(n) * 100)
const money2 = (c) => c / 100
const UNCATEGORIZED = ''

export const filterByPeriod = (txs, period) => txs.filter((t) => inPeriod(t.date, period))

export function totalsOf(txs) {
  let inc = 0, exp = 0, incN = 0, expN = 0
  for (const t of txs) { if (t.type === 'income') { inc += cents(t.amount); incN++ } else if (t.type === 'expense') { exp += cents(t.amount); expN++ } }
  return { income: money2(inc), expenses: money2(exp), net: money2(inc - exp), incomeCount: incN, expenseCount: expN, count: incN + expN }
}

// Spending (type 'expense') or income (type 'income') grouped by category, largest first. `share` is a percentage of the total of that type.
export function breakdownByCategory(txs, type, categories = []) {
  const by = new Map(); let total = 0
  for (const t of txs) {
    if (t.type !== type) continue
    const k = t.categoryId || UNCATEGORIZED, a = cents(t.amount)
    const row = by.get(k) || { categoryId: k, cents: 0, count: 0 }; row.cents += a; row.count++; by.set(k, row); total += a
  }
  const rows = [...by.values()].map((r) => {
    const cat = categories.find((c) => c.id === r.categoryId)
    return { categoryId: r.categoryId, name: cat?.name || 'Uncategorized', icon: cat?.icon || null, color: cat?.color || 'grey', known: !!cat, amount: money2(r.cents), count: r.count, share: total ? (r.cents / total) * 100 : 0 }
  })
  rows.sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name))
  return { rows, total: money2(total) }
}

// Biggest single transactions and simple averages for the "other useful summaries" block.
export function spendingSummary(txs, period) {
  const exp = txs.filter((t) => t.type === 'expense')
  const t = totalsOf(exp), range = periodRange(period)
  let days = null
  if (range) { const a = parseDay(range.from), b = parseDay(range.to); days = Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86400000) + 1 }
  else if (exp.length) { const ds = exp.map((x) => x.date.slice(0, 10)).sort(); const a = parseDay(ds[0]), b = parseDay(ds[ds.length - 1]); days = Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86400000) + 1 }
  const largest = exp.reduce((m, x) => (!m || x.amount > m.amount ? x : m), null)
  return { count: exp.length, total: t.expenses, average: exp.length ? money2(Math.round(cents(t.expenses) / exp.length)) : 0, perDay: days ? money2(Math.round(cents(t.expenses) / days)) : null, days, largest }
}

// Compare a period with the one before it. `pct` is null when the earlier period has nothing to compare against (never a made-up percentage).
export function compareTotals(cur, prev, prevTxCount) {
  const metric = (a, b) => ({ current: a, previous: b, change: money2(cents(a) - cents(b)), pct: b !== 0 ? ((cents(a) - cents(b)) / Math.abs(cents(b))) * 100 : null })
  return { hasPrevious: prevTxCount > 0, income: metric(cur.income, prev.income), expenses: metric(cur.expenses, prev.expenses), net: metric(cur.net, prev.net) }
}

// ---- Budgets -------------------------------------------------------------------------------------------------------------------------------
// Budgets are MONTHLY. A month report uses that month. A day or week report uses the month it falls in (and says so). A year or all-time report
// adds up every month that has a budget, comparing each month's budget with that same month's spending. A custom budget that is not linked to an
// expense category tracks no spending (spent stays 0 and `tracked` is false) and the page says so.
export function budgetScope(period, budgets) {
  switch (period?.kind) {
    case 'month': return { months: [period.month], note: null }
    case 'day': case 'week': { const m = period.day.slice(0, 7); return { months: [m], note: `Budgets are set per month, so this shows ${monthTitle(m)}.` } }
    case 'year': return { months: [...new Set(budgets.filter((b) => b.month.startsWith(period.year)).map((b) => b.month))].sort(), note: `Budgets are set per month. This adds up the budgets of each month in ${period.year}.` }
    default: return { months: [...new Set(budgets.map((b) => b.month))].sort(), note: 'Budgets are set per month. This adds up the budgets of every month that has one.' }
  }
}
export const budgetLevelOf = (pct) => (pct > 100 ? 'over' : pct >= 80 ? 'warn' : 'ok')
export function budgetProgress(period, budgets, txs, categories = []) {
  const scope = budgetScope(period, budgets), months = new Set(scope.months), map = new Map()
  for (const b of budgets) {
    if (!months.has(b.month)) continue
    const cat = b.categoryId ? categories.find((c) => c.id === b.categoryId) : null
    const key = b.categoryId ? `c:${b.categoryId}` : `n:${(b.name || '').trim().toLowerCase()}`
    let spent = 0
    if (b.categoryId) for (const t of txs) if (t.type === 'expense' && t.categoryId === b.categoryId && t.date.startsWith(b.month)) spent += cents(t.amount)
    const row = map.get(key) || { key, name: (b.name || '').trim() || cat?.name || 'Budget', icon: b.icon || cat?.icon || null, color: cat?.color || 'grey', budgeted: 0, spent: 0, tracked: !!b.categoryId, months: 0 }
    row.budgeted += cents(b.amount); row.spent += spent; row.months++; map.set(key, row)
  }
  const rows = [...map.values()].map((r) => {
    const pct = r.budgeted > 0 ? Math.round((r.spent / r.budgeted) * 100) : 0
    return { ...r, budgeted: money2(r.budgeted), spent: money2(r.spent), remaining: money2(r.budgeted - r.spent), pct, level: budgetLevelOf(pct) }
  }).sort((a, b) => b.pct - a.pct || a.name.localeCompare(b.name))
  const sum = (k) => money2(rows.reduce((s, r) => s + cents(r[k]), 0))
  return {
    note: scope.note, months: scope.months, rows,
    budgeted: sum('budgeted'), spent: sum('spent'), remaining: sum('remaining'),
    pct: rows.length && sum('budgeted') > 0 ? Math.round((sum('spent') / sum('budgeted')) * 100) : 0,
    over: rows.filter((r) => r.level === 'over'), approaching: rows.filter((r) => r.level === 'warn'),
    unusedTotal: money2(rows.reduce((s, r) => s + Math.max(0, cents(r.remaining)), 0)), // budget left across categories that are not over
    hasUntracked: rows.some((r) => !r.tracked),
  }
}

// ---- Savings -------------------------------------------------------------------------------------------------------------------------------
// Transfers and reallocations are INTERNAL moves of the user's own money. They are reported here and nowhere else.
export function savingsFlows(period, transfers = [], reallocations = []) {
  let toSavings = 0, toCurrent = 0, moved = 0, nIn = 0, nOut = 0
  for (const t of transfers) { if (!inPeriod(t.date, period)) continue; if (t.direction === 'to_savings') { toSavings += cents(t.amount); nIn++ } else { toCurrent += cents(t.amount); nOut++ } }
  for (const r of reallocations) if (inPeriod(r.date, period)) moved += cents(r.amount)
  return { toSavings: money2(toSavings), toCurrent: money2(toCurrent), net: money2(toSavings - toCurrent), reallocated: money2(moved), count: nIn + nOut }
}

// ---- Time series ---------------------------------------------------------------------------------------------------------------------------
function monthKeys(from, to) { const out = []; let m = from; while (m <= to) { out.push(m); m = shiftMonthStr(m, 1) } return out }
const dayKeys = (from, to) => { const out = []; for (let d = from; d <= to; d = addDays(d, 1)) out.push(d); return out }
export const MAX_MONTH_BUCKETS = 36
// Buckets for the charts: day -> that day; week and month -> one per day; year -> one per month; all time -> one per month (one per year when the
// history is longer than 36 months). Older data is never dropped: all-time starts at the first transaction.
export function seriesFor(period, txs) {
  let buckets
  const range = periodRange(period)
  if (period?.kind === 'day') buckets = [{ key: period.day, from: period.day, to: period.day, label: `${MONTHS[parseDay(period.day).m - 1].slice(0, 3)} ${parseDay(period.day).d}` }]
  else if (period?.kind === 'week' || period?.kind === 'month') buckets = dayKeys(range.from, range.to).map((d) => ({ key: d, from: d, to: d, label: period.kind === 'week' ? `${weekdayName(d).slice(0, 3)} ${+d.slice(8)}` : String(+d.slice(8)) }))
  else if (period?.kind === 'year') buckets = monthKeys(`${period.year}-01`, `${period.year}-12`).map((m) => ({ key: m, from: `${m}-01`, to: `${m}-31`, label: MONTHS[+m.slice(5) - 1].slice(0, 3) }))
  else {
    if (!txs.length) return []
    const ds = txs.map((t) => t.date.slice(0, 7)).sort(), first = ds[0], last = ds[ds.length - 1], n = monthKeys(first, last).length
    if (n <= MAX_MONTH_BUCKETS) buckets = monthKeys(first, last).map((m) => ({ key: m, from: `${m}-01`, to: `${m}-31`, label: `${MONTHS[+m.slice(5) - 1].slice(0, 3)} ${m.slice(2, 4)}` }))
    else buckets = Array.from({ length: +last.slice(0, 4) - +first.slice(0, 4) + 1 }, (_, i) => { const y = String(+first.slice(0, 4) + i); return { key: y, from: `${y}-01-01`, to: `${y}-12-31`, label: y } })
  }
  const idx = new Map(buckets.map((b, i) => [b.key, i])), inc = buckets.map(() => 0), exp = buckets.map(() => 0)
  const keyOf = (date) => (period?.kind === 'year' || (period?.kind === 'all' && buckets[0]?.key.length === 7)) ? date.slice(0, 7) : period?.kind === 'all' ? date.slice(0, 4) : date.slice(0, 10)
  for (const t of txs) { const i = idx.get(keyOf(t.date)); if (i === undefined) continue; if (t.type === 'income') inc[i] += cents(t.amount); else if (t.type === 'expense') exp[i] += cents(t.amount) }
  return buckets.map((b, i) => ({ ...b, income: money2(inc[i]), expenses: money2(exp[i]), net: money2(inc[i] - exp[i]) }))
}
export const seriesUnit = (period, series) => (period?.kind === 'year' ? 'month' : period?.kind === 'all' ? (series[0]?.key.length === 4 ? 'year' : 'month') : 'day')
