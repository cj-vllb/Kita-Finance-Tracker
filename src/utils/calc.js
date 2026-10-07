const sum = (l) => l.reduce((s, x) => s + Number(x.amount), 0)
export const inMonth = (txs, ym) => txs.filter((t) => t.date.startsWith(ym))
export const calculateIncome = (txs) => sum(txs.filter((t) => t.type === 'income'))
export const calculateExpenses = (txs) => sum(txs.filter((t) => t.type === 'expense'))
export const calculateNet = (txs) => calculateIncome(txs) - calculateExpenses(txs)
// Current balance = all recorded income minus all recorded expenses (not a bank balance).
export const calculateBalance = (txs) => calculateNet(txs)
const spentOf = (b, txs) => sum(inMonth(txs, b.month).filter((t) => t.type === 'expense' && t.categoryId === b.categoryId))
export const calculateBudgetSpent = spentOf
export const calculateBudgetRemaining = (b, txs) => b.amount - spentOf(b, txs)
export const calculateBudgetPercentage = (b, txs) => Math.round((spentOf(b, txs) / b.amount) * 100)
export const budgetLevel = (pct) => (pct > 100 ? 'over' : pct >= 80 ? 'warn' : 'ok')
export const groupExpensesByCategory = (txs) => {
  const map = {}; txs.filter((t) => t.type === 'expense').forEach((t) => { map[t.categoryId] = (map[t.categoryId] || 0) + Number(t.amount) })
  return Object.entries(map).map(([categoryId, amount]) => ({ categoryId, amount })).sort((a, b) => b.amount - a.amount)
}
export const groupTransactionsByMonth = (txs, months) => months.map((month) => { const m = inMonth(txs, month); return { month, income: calculateIncome(m), expenses: calculateExpenses(m), net: calculateNet(m) } })
export const runningTotals = (txs, ym, days) => Array.from({ length: days }, (_, i) => {
  const day = `${ym}-${String(i + 1).padStart(2, '0')}`, upTo = inMonth(txs, ym).filter((t) => t.date <= day)
  return { day: i + 1, income: calculateIncome(upTo), expenses: calculateExpenses(upTo) }
})
export const shiftMonth = (ym, delta) => { const [y, m] = ym.split('-').map(Number), x = new Date(y, m - 1 + delta, 1); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}` }
export const allMonths = (txs, extra = []) => [...new Set([...txs.map((t) => t.date.slice(0, 7)), ...extra])].sort()
