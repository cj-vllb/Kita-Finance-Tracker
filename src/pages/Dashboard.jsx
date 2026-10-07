import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { money, greeting, firstName, monthLabel, monthName, monthShort, formatDateLong } from '../utils/format.js'
import * as c from '../utils/calc.js'
import { CURRENT_MONTH, TODAY } from '../utils/dates.js'
import { MoneyFlowChart } from '../components/charts.jsx'
import { LoadingState, useLoading } from '../components/ui.jsx'
export default function Dashboard() {
  const { user, transactions, budgets, categories } = useApp(), loading = useLoading()
  const name = (id) => categories.find((x) => x.id === id)?.name ?? 'Uncategorized'
  const month = c.inMonth(transactions, CURRENT_MONTH), income = c.calculateIncome(month), expenses = c.calculateExpenses(month), net = income - expenses
  const [top] = c.groupExpensesByCategory(month), prev = c.inMonth(transactions, c.shiftMonth(CURRENT_MONTH, -1)), prevExp = c.calculateExpenses(prev)
  const diff = prevExp ? Math.round((1 - expenses / prevExp) * 100) : null
  const rows = budgets.filter((b) => b.month === CURRENT_MONTH).map((b) => ({ b, remaining: c.calculateBudgetRemaining(b, transactions), pct: c.calculateBudgetPercentage(b, transactions) }))
  const within = rows.filter((r) => r.pct <= 100).length, worst = [...rows].sort((a, b) => b.pct - a.pct)[0]
  const food = rows.find((r) => name(r.b.categoryId) === 'Food') || [...rows].sort((a, b) => a.remaining - b.remaining)[0]
  const largest = month.filter((t) => t.type === 'expense').sort((a, b) => b.amount - a.amount)[0]
  const days = Number(TODAY.slice(8))
  const chart = c.runningTotals(transactions, CURRENT_MONTH, days).map((d) => ({ ...d, label: `${monthShort(CURRENT_MONTH)} ${d.day}` }))
  return (<>
    <h1>{greeting()}, {firstName(user)}</h1><p className="muted">Here is your financial overview for {monthLabel(CURRENT_MONTH)}.</p>
    {loading ? <div style={{ marginTop: 40 }}><LoadingState rows={5} /></div> : <>
      <section style={{ marginTop: 40 }} aria-label="Balance"><div className="muted">Current balance</div><div className="balance">{money(c.calculateBalance(transactions, CURRENT_MONTH))}</div><div className="muted small">Updated today, {formatDateLong(TODAY).replace(/, \d+$/, '')}</div>
        <div className="figures">
          <div><div className="muted">Monthly income</div><div className="v pos">+{money(income)}</div></div>
          <div><div className="muted">Monthly expenses</div><div className="v neg">−{money(expenses)}</div></div>
          <div><div className="muted">Net change</div><div className="v">{net >= 0 ? '+' : '−'}{money(Math.abs(net))}</div>{income > 0 && <div className="muted small">{Math.round((net / income) * 100)}% of income kept this month</div>}</div></div></section>
      <section className="section"><h2>Monthly money flow</h2><p className="muted small" style={{ marginBottom: 16 }}>Running totals for {monthName(CURRENT_MONTH)} 1 to {days}</p><MoneyFlowChart data={chart} /></section>
      <section className="section"><h2>This month at a glance</h2><div className="glance">
        <div><div className="muted">Highest spending category</div>{top ? <><div className="v">{name(top.categoryId)} · {money(top.amount)}</div><div className="muted small">{Math.round((top.amount / expenses) * 100)}% of this month's expenses</div></> : <div className="v">No expenses yet</div>}</div>
        <div><div className="muted">Compared with {monthName(c.shiftMonth(CURRENT_MONTH, -1))}</div>{diff === null ? <div className="v">No earlier data</div> : <><div className="v">{Math.abs(diff)}% {diff >= 0 ? 'less' : 'more'} spent</div><div className="muted small">{money(expenses)} so far, {money(prevExp)} last month</div></>}</div>
        <div><div className="muted">Budget status</div>{rows.length ? <><div className="v">{within === rows.length ? `All ${rows.length} within limit` : `${within} of ${rows.length} within limit`}</div>{worst.pct >= 80 && <div className="muted small">{name(worst.b.categoryId)} is at {worst.pct}%</div>}</> : <div className="v">No budgets set</div>}</div></div></section>
      {(food || largest) && <section className="section"><h2>Worth knowing</h2>
        {food && <p>{name(food.b.categoryId)} has {food.remaining >= 0 ? `${money(food.remaining)} remaining` : `gone ${money(-food.remaining)} over`} in this month's budget.</p>}
        {food && <p className="muted small">Budgets reset on {monthName(c.shiftMonth(CURRENT_MONTH, 1))} 1.</p>}
        {largest && <p style={{ marginTop: 12 }}>Largest expense this month: {largest.description}, {money(largest.amount)}.</p>}
        {largest && <p className="muted small">Paid on {formatDateLong(largest.date).replace(/, \d+$/, '')}, category {name(largest.categoryId)}.</p>}</section>}
      <section className="section links">
        <div><Link to="/transactions">View transactions</Link><p className="muted small">Search, filter and edit records</p></div>
        <div><Link to="/budgets">Manage budgets</Link><p className="muted small">Set limits and check what is left</p></div>
        <div><Link to="/reports">View reports</Link><p className="muted small">Compare months and categories</p></div></section></>}
  </>)
}
