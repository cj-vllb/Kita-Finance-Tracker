import test from 'node:test'
import assert from 'node:assert/strict'
import * as r from './reportStats.js'

const tx = (id, date, type, amount, categoryId = '', extra = {}) => ({ id, date, type, amount, categoryId, balance: 'current', goalId: '', ...extra })
const cats = [{ id: 'food', name: 'Food & Dining', icon: 'utensils', color: 'orange' }, { id: 'rent', name: 'Housing & Rent', icon: 'home', color: 'blue' }, { id: 'sal', name: 'Salary & Wages', icon: 'banknote', color: 'green' }, { id: 'tip', name: 'Tips', icon: 'coins', color: 'yellow' }]
const data = [
  tx(1, '2026-09-10', 'income', 20000, 'sal'), tx(2, '2026-09-12', 'expense', 5000, 'rent'), tx(3, '2026-09-20', 'expense', 1000, 'food'),
  tx(4, '2026-10-01', 'income', 25000, 'sal'), tx(5, '2026-10-02', 'income', 0.1, 'tip'), tx(6, '2026-10-02', 'income', 0.2, 'tip'),
  tx(7, '2026-10-03', 'expense', 6000, 'rent'), tx(8, '2026-10-12', 'expense', 450.55, 'food'), tx(9, '2026-10-12', 'expense', 99.45, 'food'),
  tx(10, '2026-10-16', 'expense', 300), // uncategorized
  tx(11, '2026-10-18', 'expense', 100, 'food', { balance: 'savings' }), // paid from savings: still a real expense
]
const oct = { kind: 'month', month: '2026-10' }

test('totals add in cents and never drift', () => {
  const t = r.totalsOf(r.filterByPeriod(data, oct))
  assert.equal(t.income, 25000.3)
  assert.equal(t.expenses, 6000 + 450.55 + 99.45 + 300 + 100)
  assert.equal(t.net, 25000.3 - 6950)
  assert.equal(t.expenseCount, 5)
})
test('day, week, month, year and all periods select the right rows', () => {
  const ids = (p) => r.filterByPeriod(data, p).map((x) => x.id)
  assert.deepEqual(ids({ kind: 'day', day: '2026-10-12' }), [8, 9])
  assert.deepEqual(ids({ kind: 'week', day: '2026-10-14' }), [8, 9, 10, 11]) // Mon Oct 12 to Sun Oct 18
  assert.deepEqual(ids({ kind: 'month', month: '2026-09' }), [1, 2, 3])
  assert.equal(ids({ kind: 'year', year: '2026' }).length, 11)
  assert.equal(ids({ kind: 'year', year: '2025' }).length, 0)
  assert.equal(ids({ kind: 'all' }).length, 11)
})
test('category breakdown sums to the total and shares add to 100', () => {
  const m = r.filterByPeriod(data, oct), b = r.breakdownByCategory(m, 'expense', cats)
  assert.equal(b.total, r.totalsOf(m).expenses)
  assert.equal(b.rows.reduce((s, x) => Math.round(s * 100 + x.amount * 100) / 100, 0), b.total)
  assert.equal(Math.round(b.rows.reduce((s, x) => s + x.share, 0) * 1e6) / 1e6, 100)
  assert.equal(b.rows[0].name, 'Housing & Rent'); assert.equal(b.rows[0].amount, 6000)
  const food = b.rows.find((x) => x.categoryId === 'food'); assert.equal(food.amount, 650); assert.equal(food.count, 3); assert.equal(food.icon, 'utensils')
  const unc = b.rows.find((x) => x.categoryId === ''); assert.equal(unc.name, 'Uncategorized'); assert.equal(unc.known, false)
})
test('income breakdown only contains income, and expenses never leak into it', () => {
  const b = r.breakdownByCategory(r.filterByPeriod(data, oct), 'income', cats)
  assert.deepEqual(b.rows.map((x) => x.name), ['Salary & Wages', 'Tips'])
  assert.equal(b.rows[1].amount, 0.3)
  assert.equal(b.total, 25000.3)
})
test('a deleted or unknown category still shows its amount, as Uncategorized', () => {
  const b = r.breakdownByCategory([tx(1, '2026-10-01', 'expense', 50, 'gone')], 'expense', cats)
  assert.equal(b.rows.length, 1); assert.equal(b.rows[0].name, 'Uncategorized'); assert.equal(b.rows[0].amount, 50)
})
test('empty data is safe', () => {
  const b = r.breakdownByCategory([], 'expense', cats)
  assert.deepEqual(b, { rows: [], total: 0 })
  assert.deepEqual(r.totalsOf([]), { income: 0, expenses: 0, net: 0, incomeCount: 0, expenseCount: 0, count: 0 })
  assert.equal(r.spendingSummary([], oct).average, 0)
  assert.deepEqual(r.seriesFor({ kind: 'all' }, []), [])
})
test('comparison with the previous period never invents a percentage', () => {
  const cur = r.totalsOf(r.filterByPeriod(data, oct)), prev = r.totalsOf(r.filterByPeriod(data, { kind: 'month', month: '2026-09' }))
  const c = r.compareTotals(cur, prev, 3)
  assert.equal(c.hasPrevious, true)
  assert.equal(c.income.change, 5000.3); assert.ok(Math.abs(c.income.pct - 25.0015) < 1e-9)
  assert.equal(c.expenses.previous, 6000)
  const none = r.compareTotals(cur, r.totalsOf([]), 0)
  assert.equal(none.hasPrevious, false); assert.equal(none.income.pct, null); assert.equal(none.expenses.pct, null)
})
test('spending summary: count, average, per-day figure, largest', () => {
  const s = r.spendingSummary(r.filterByPeriod(data, oct), oct)
  assert.equal(s.count, 5); assert.equal(s.days, 31); assert.equal(s.largest.id, 7)
  assert.equal(s.average, 1390); assert.equal(s.perDay, Math.round(6950 / 31 * 100) / 100)
})

const budgets = [
  { id: 'b1', categoryId: 'rent', amount: 6000, month: '2026-10', name: null, icon: null },
  { id: 'b2', categoryId: 'food', amount: 700, month: '2026-10', name: null, icon: null },
  { id: 'b3', categoryId: 'rent', amount: 5000, month: '2026-09', name: null, icon: null },
  { id: 'b4', categoryId: null, amount: 1000, month: '2026-10', name: 'Fun money', icon: 'party-popper' },
  { id: 'b5', categoryId: 'food', amount: 100, month: '2026-09', name: null, icon: null },
]
test('budget progress for one month: spent comes from the linked category in that month only', () => {
  const p = r.budgetProgress(oct, budgets, data, cats)
  assert.equal(p.rows.length, 3)
  const food = p.rows.find((x) => x.key === 'c:food'), rent = p.rows.find((x) => x.key === 'c:rent'), fun = p.rows.find((x) => x.name === 'Fun money')
  assert.equal(food.spent, 650); assert.equal(food.remaining, 50); assert.equal(food.pct, 93); assert.equal(food.level, 'warn')
  assert.equal(rent.spent, 6000); assert.equal(rent.pct, 100); assert.equal(rent.level, 'warn') // exactly 100% is at the limit, not over
  assert.equal(fun.tracked, false); assert.equal(fun.spent, 0); assert.equal(fun.icon, 'party-popper')
  assert.equal(p.budgeted, 7700); assert.equal(p.spent, 6650); assert.equal(p.remaining, 1050)
  assert.deepEqual(p.over.map((x) => x.name), []); assert.equal(p.approaching.length, 2); assert.equal(p.hasUntracked, true)
  assert.equal(p.note, null)
})
test('over-budget categories are reported', () => {
  const p = r.budgetProgress(oct, [{ id: 'x', categoryId: 'food', amount: 500, month: '2026-10' }], data, cats)
  assert.equal(p.rows[0].level, 'over'); assert.equal(p.rows[0].remaining, -150); assert.equal(p.over.length, 1); assert.equal(p.unusedTotal, 0)
})
test('day and week reports use the month and say so; year and all time add up each month', () => {
  const d = r.budgetProgress({ kind: 'day', day: '2026-10-12' }, budgets, data, cats)
  assert.deepEqual(d.months, ['2026-10']); assert.match(d.note, /October 2026/)
  const y = r.budgetProgress({ kind: 'year', year: '2026' }, budgets, data, cats)
  const food = y.rows.find((x) => x.key === 'c:food'); assert.equal(food.budgeted, 800); assert.equal(food.spent, 650 + 1000); assert.equal(food.months, 2)
  assert.equal(r.budgetProgress({ kind: 'year', year: '2030' }, budgets, data, cats).rows.length, 0)
  assert.equal(r.budgetProgress({ kind: 'all' }, budgets, data, cats).months.length, 2)
})
test('no budgets means an empty result, not fake data', () => {
  const p = r.budgetProgress(oct, [], data, cats)
  assert.deepEqual([p.rows.length, p.budgeted, p.spent, p.remaining, p.pct], [0, 0, 0, 0, 0])
})

test('savings transfers are reported separately and never touch income or expense totals', () => {
  const transfers = [{ date: '2026-10-05', direction: 'to_savings', amount: 3000 }, { date: '2026-10-09', direction: 'to_current', amount: 500.5 }, { date: '2026-09-30', direction: 'to_savings', amount: 999 }]
  const re = [{ date: '2026-10-10', amount: 700 }]
  const f = r.savingsFlows(oct, transfers, re)
  assert.deepEqual(f, { toSavings: 3000, toCurrent: 500.5, net: 2499.5, reallocated: 700, count: 2 })
  const before = r.totalsOf(r.filterByPeriod(data, oct))
  assert.equal(r.totalsOf(r.filterByPeriod(data, oct)).income, before.income) // transfers are not an input to totals at all
  assert.equal(before.income, 25000.3); assert.equal(before.expenses, 6950)
  assert.equal(r.savingsFlows({ kind: 'all' }, transfers, re).toSavings, 3999)
})

test('series: month has one bucket per day and the buckets sum to the totals', () => {
  const m = r.filterByPeriod(data, oct), s = r.seriesFor(oct, m)
  assert.equal(s.length, 31)
  assert.equal(s[11].expenses, 550); assert.equal(s[11].label, '12')
  assert.equal(Math.round(s.reduce((a, b) => a + b.income * 100, 0)), 2500030)
  assert.equal(Math.round(s.reduce((a, b) => a + b.expenses * 100, 0)), 695000)
})
test('series: week has seven day buckets, labelled with the weekday', () => {
  const w = { kind: 'week', day: '2026-10-14' }, s = r.seriesFor(w, r.filterByPeriod(data, w))
  assert.deepEqual(s.map((x) => x.label), ['Mon 12', 'Tue 13', 'Wed 14', 'Thu 15', 'Fri 16', 'Sat 17', 'Sun 18'])
  assert.equal(s[0].expenses, 550); assert.equal(s[4].expenses, 300); assert.equal(s[6].expenses, 100)
})
test('series: day is a single bucket', () => {
  const d = { kind: 'day', day: '2026-10-12' }, s = r.seriesFor(d, r.filterByPeriod(data, d))
  assert.equal(s.length, 1); assert.equal(s[0].expenses, 550); assert.equal(s[0].label, 'Oct 12')
})
test('series: year has twelve month buckets', () => {
  const y = { kind: 'year', year: '2026' }, s = r.seriesFor(y, r.filterByPeriod(data, y))
  assert.equal(s.length, 12); assert.equal(s[8].income, 20000); assert.equal(s[9].income, 25000.3); assert.equal(s[0].expenses, 0)
  assert.equal(r.seriesUnit(y, s), 'month')
})
test('series: all time starts at the first transaction and keeps empty months in between', () => {
  const t = [tx(1, '2025-11-05', 'income', 10), tx(2, '2026-02-10', 'expense', 4)], s = r.seriesFor({ kind: 'all' }, t)
  assert.deepEqual(s.map((x) => x.key), ['2025-11', '2025-12', '2026-01', '2026-02'])
  assert.equal(s[0].income, 10); assert.equal(s[1].income, 0); assert.equal(s[3].expenses, 4)
})
test('series: a long history switches to yearly buckets without dropping anything', () => {
  const t = [tx(1, '2020-03-05', 'income', 100), tx(2, '2024-01-10', 'expense', 40), tx(3, '2026-10-10', 'income', 7)], s = r.seriesFor({ kind: 'all' }, t)
  assert.deepEqual(s.map((x) => x.key), ['2020', '2021', '2022', '2023', '2024', '2025', '2026'])
  assert.equal(s[0].income, 100); assert.equal(s[4].expenses, 40); assert.equal(s[6].income, 7)
  assert.equal(r.seriesUnit({ kind: 'all' }, s), 'year')
  assert.equal(s.reduce((a, b) => a + b.income, 0), 107)
})
