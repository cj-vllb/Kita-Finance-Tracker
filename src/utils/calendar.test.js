import test from 'node:test'
import assert from 'node:assert/strict'
import { monthCalendar, daysInMonth, startWeekday, cellAmount, WEEKDAYS } from './calendar.js'
const tx = (date, type, amount, balance = 'current') => ({ id: Math.random().toString(36), date, type, amount, balance })
const days = (cal) => cal.weeks.flat().filter(Boolean)

test('month length and first weekday, including leap years', () => {
  assert.equal(daysInMonth('2026-10'), 31); assert.equal(daysInMonth('2026-02'), 28); assert.equal(daysInMonth('2028-02'), 29); assert.equal(daysInMonth('2026-04'), 30)
  assert.equal(startWeekday('2026-10'), 4) // Thursday, 1 Oct 2026
  assert.equal(startWeekday('2026-02'), 0) // Sunday, 1 Feb 2026
  assert.equal(WEEKDAYS.length, 7)
})
test('grid: always whole weeks of 7, every day exactly once, in order, padded with nulls', () => {
  for (const ym of ['2026-02', '2026-10', '2028-02', '2026-03', '2026-08', '2027-05']) {
    const c = monthCalendar([], ym), flat = c.weeks.flat()
    assert.ok(c.weeks.every((w) => w.length === 7), ym); assert.equal(flat.length % 7, 0)
    assert.deepEqual(days(c).map((d) => d.day), Array.from({ length: daysInMonth(ym) }, (_, i) => i + 1), ym)
    assert.equal(flat.findIndex(Boolean), startWeekday(ym), ym)          // the 1st sits under the right weekday
    assert.ok(c.weeks.length >= 4 && c.weeks.length <= 6, ym)
  }
  assert.equal(monthCalendar([], '2026-02').weeks.length, 4) // 28 days starting on Sunday
  assert.equal(monthCalendar([], '2026-10').weeks.length, 5)
  assert.equal(monthCalendar([], '2026-08').weeks.length, 6) // 31 days starting on Saturday
})
test('a month with no transactions is all zeros', () => {
  const c = monthCalendar([], '2026-10')
  assert.equal(c.income, 0); assert.equal(c.expenses, 0); assert.equal(c.active, 0)
  assert.ok(days(c).every((d) => d.income === 0 && d.expenses === 0))
})
test('income and expenses are aggregated per day from the real transactions', () => {
  const c = monthCalendar([tx('2026-10-05', 'income', 1000), tx('2026-10-05', 'income', 250.5), tx('2026-10-05', 'expense', 80), tx('2026-10-06', 'expense', 12.25), tx('2026-10-31', 'income', 1)], '2026-10')
  const d = (n) => days(c).find((x) => x.day === n)
  assert.deepEqual([d(5).income, d(5).expenses], [1250.5, 80]); assert.deepEqual([d(6).income, d(6).expenses], [0, 12.25]); assert.deepEqual([d(31).income, d(31).expenses], [1, 0])
  assert.equal(c.income, 1251.5); assert.equal(c.expenses, 92.25); assert.equal(c.active, 3)
})
test('only the displayed month is counted', () => {
  const c = monthCalendar([tx('2026-09-30', 'income', 999), tx('2026-11-01', 'expense', 999), tx('2025-10-05', 'income', 999), tx('2026-10-05', 'income', 5)], '2026-10')
  assert.equal(c.income, 5); assert.equal(c.expenses, 0)
})
test('cents never drift (0.1 + 0.2) and both balances count, once each', () => {
  const c = monthCalendar([tx('2026-10-02', 'income', 0.1), tx('2026-10-02', 'income', 0.2), tx('2026-10-02', 'expense', 5, 'savings'), tx('2026-10-02', 'expense', 7, 'current')], '2026-10')
  const d = days(c).find((x) => x.day === 2)
  assert.equal(d.income, 0.3); assert.equal(d.expenses, 12)
})
test('the totals equal the sum of the days, which equals the Dashboard monthly figures', () => {
  const list = [tx('2026-10-01', 'income', 100.1), tx('2026-10-15', 'income', 200.2), tx('2026-10-15', 'expense', 50.05), tx('2026-10-20', 'expense', 0.01)]
  const c = monthCalendar(list, '2026-10'), sum = (k) => Math.round(days(c).reduce((s, d) => s + d[k] * 100, 0)) / 100
  assert.equal(sum('income'), c.income); assert.equal(sum('expenses'), c.expenses)
})
test('cellAmount: short, but exact below 1,000 and for whole amounts', () => {
  assert.equal(cellAmount(0, '₱'), '₱0'); assert.equal(cellAmount(250, '₱'), '₱250'); assert.equal(cellAmount(12.5, '₱'), '₱12.50'); assert.equal(cellAmount(999.99, '₱'), '₱999.99')
  assert.equal(cellAmount(1250.5, '₱'), '₱1,251'); assert.equal(cellAmount(40100, '$'), '$40,100'); assert.equal(cellAmount(123456, ''), '123.5k'); assert.equal(cellAmount(2500000, '₱'), '₱2.5M'); assert.equal(cellAmount(-30, '₱'), '₱30')
})
