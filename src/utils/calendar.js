// Month calendar for the Dashboard. Pure functions, no imports: every number comes from the transactions it is given (nothing is sample data).
// Weeks start on Sunday. Money is summed in integer cents, so 0.1 + 0.2 is exactly 0.3.
// Income and expenses count EVERY income/expense row once, whichever balance it used, exactly like Monthly income / Monthly expenses on the Dashboard.
const cents = (n) => Math.round(Number(n) * 100)
const pad = (n) => String(n).padStart(2, '0')
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const daysInMonth = (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate() }
export const startWeekday = (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1, 1).getDay() } // 0 = Sunday

// -> { weeks: [[cell | null x7] ...], income, expenses, active }. A cell is { day, date, income, expenses }; null pads the days outside the month.
// `active` is the number of days that have any activity.
export function monthCalendar(transactions, ym) {
  const n = daysInMonth(ym), by = new Map()
  for (const t of transactions) {
    if (!t.date || !t.date.startsWith(ym + '-')) continue
    const d = Number(t.date.slice(8, 10)), row = by.get(d) || { income: 0, expenses: 0 }
    if (t.type === 'income') row.income += cents(t.amount); else row.expenses += cents(t.amount)
    by.set(d, row)
  }
  const cells = Array.from({ length: startWeekday(ym) }, () => null); let income = 0, expenses = 0
  for (let d = 1; d <= n; d++) {
    const r = by.get(d) || { income: 0, expenses: 0 }; income += r.income; expenses += r.expenses
    cells.push({ day: d, date: `${ym}-${pad(d)}`, income: r.income / 100, expenses: r.expenses / 100 })
  }
  while (cells.length % 7) cells.push(null)
  const weeks = []; for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return { weeks, income: income / 100, expenses: expenses / 100, active: by.size }
}

// A short amount for a small calendar cell. Whole amounts have no decimals; cents are shown below 1,000; large amounts become 12.3k / 1.2M.
// The exact amount is always available in the cell's accessible label, so rounding here is display only. `prefix` is the currency symbol.
// `short` (for a narrow calendar) turns every amount from 1,000 up into 1.3k / 40k / 2.5M.
export function cellAmount(n, prefix = '', { short = false } = {}) {
  const v = Math.abs(Number(n))
  if (short && v >= 1e3 && v < 1e6) return prefix + +(v / 1e3).toFixed(v >= 1e5 ? 0 : 1) + 'k'
  if (v >= 1e6) return prefix + +(v / 1e6).toFixed(2) + 'M'
  if (v >= 1e5) return prefix + +(v / 1e3).toFixed(1) + 'k'
  if (v >= 1e3) return prefix + Math.round(v).toLocaleString('en-US')
  return prefix + (Number.isInteger(v) ? String(v) : v.toFixed(2))
}
