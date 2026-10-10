import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { money, signed, greeting, firstName, monthLabel, monthName, monthShort, formatDate, formatDateLong, txLabel } from '../utils/format.js'
import * as c from '../utils/calc.js'
import { CURRENT_MONTH, TODAY } from '../utils/dates.js'
import { MoneyFlowChart, MiniBars } from '../components/charts.jsx'
import { CategoryLabel } from '../components/ui.jsx'
export default function Dashboard() {
  const { user, transactions, budgets, categories } = useApp()
  const name = (id) => categories.find((x) => x.id === id)?.name ?? 'Uncategorized'
  const month = c.inMonth(transactions, CURRENT_MONTH), income = c.calculateIncome(month), expenses = c.calculateExpenses(month), net = income - expenses
  const [top] = c.groupExpensesByCategory(month), prev = c.inMonth(transactions, c.shiftMonth(CURRENT_MONTH, -1)), prevExp = c.calculateExpenses(prev)
  const diff = prevExp ? Math.round((1 - expenses / prevExp) * 100) : null
  const rows = budgets.filter((b) => b.month === CURRENT_MONTH).map((b) => ({ b, spent: c.calculateBudgetSpent(b, transactions), remaining: c.calculateBudgetRemaining(b, transactions), pct: c.calculateBudgetPercentage(b, transactions) }))
  const within = rows.filter((r) => r.pct <= 100).length, worst = [...rows].sort((a, b) => b.pct - a.pct)[0]
  // Previews: all derived from the same in-memory data the other pages use. Nothing is written or duplicated.
  const recent = [...transactions].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 5)
  const budgetTop = [...rows].sort((a, b) => b.pct - a.pct).slice(0, 3)
  const trend = c.groupTransactionsByMonth(transactions, c.allMonths(transactions, [CURRENT_MONTH]).filter((m) => m <= CURRENT_MONTH).slice(-6))
  const days = Number(TODAY.slice(8))
  const chart = c.runningTotals(transactions, CURRENT_MONTH, days).map((d) => ({ ...d, label: `${monthShort(CURRENT_MONTH)} ${d.day}` }))
  return (<>
    <h1>{greeting()}, {firstName(user)}</h1><p className="muted">Here is your financial overview for {monthLabel(CURRENT_MONTH)}.</p>
    <>
      <section className="hero-balance" aria-label="Balance"><div className="balance-label">Current balance</div><div className="balance">{money(c.calculateBalance(transactions, CURRENT_MONTH))}</div><div className="muted small">Updated today, {formatDateLong(TODAY).replace(/, \d+$/, '')}</div>
        <div className="figures">
          <div><div className="muted">Monthly income</div><div className="v pos">+{money(income)}</div></div>
          <div><div className="muted">Monthly expenses</div><div className="v neg">−{money(expenses)}</div></div>
          <div><div className="muted">Net change</div><div className="v">{net >= 0 ? '+' : '−'}{money(Math.abs(net))}</div>{income > 0 && <div className="muted small">{Math.round((net / income) * 100)}% of income kept this month</div>}</div></div></section>
      <div className="previews charts">
        <section className="preview" aria-label="Monthly money flow"><div className="preview-body"><h2>Monthly money flow</h2><MoneyFlowChart data={chart} /><p className="muted small" style={{ marginTop: 12 }}>Running totals for {monthName(CURRENT_MONTH)} 1 to {days}</p></div></section>
        <Preview title="Reports" sub={transactions.length ? `Income and expenses, last ${trend.length} month${trend.length === 1 ? '' : 's'}` : null} to="/reports" action="View Reports">
          {transactions.length === 0 ? <p className="muted pv-empty">Add transactions and your reports will fill in.</p> : <>
            <MiniBars data={trend} />
            <div className="legend small"><span><span className="dot" style={{ background: 'var(--color-primary)' }} />Income</span><span><span className="dot" style={{ background: 'var(--color-negative)' }} />Expenses</span></div>
            {top && <p className="small muted" style={{ marginTop: 8 }}>{name(top.categoryId)} is {Math.round((top.amount / expenses) * 100)}% of this month's expenses.</p>}</>}</Preview></div>
      <div className="previews cards">
        <Preview title="Recent transactions" sub={recent.length ? 'Your latest activity' : null} to="/transactions" action="View All Transaction History">
          {recent.length === 0 ? <p className="muted pv-empty">No transactions yet. <Link to="/transactions/new">Add your first transaction</Link></p> :
            <ul className="tx-list">{recent.map((t) => <li key={t.id}><Link to={`/transactions/${t.id}`} className="tx-item"><span className="tx-main"><span className="tx-title">{txLabel(t, categories)}</span><span className="muted small"><CategoryLabel id={t.categoryId} categories={categories} /> · {formatDate(t.date)}</span></span><span className={`amount ${t.type === 'income' ? 'pos' : 'neg'}`}>{signed(t.amount, t.type)}</span></Link></li>)}</ul>}</Preview>
        <Preview title="Budgets" sub={monthLabel(CURRENT_MONTH)} to="/budgets" action="View All Budgets">
          {budgetTop.length === 0 ? <p className="muted pv-empty">No budgets set for this month. <Link to="/budgets/new">Create a budget</Link></p> :
            <ul className="bp-list">{budgetTop.map(({ b, spent, remaining, pct }) => <li key={b.id}><div className="bp-top"><span>{name(b.categoryId)}</span><span className="muted small">{money(spent)} of {money(b.amount)}</span></div>
              <div className="bar" role="progressbar" aria-valuenow={Math.min(pct, 100)} aria-valuemin="0" aria-valuemax="100" aria-label={`${name(b.categoryId)} budget used`}><div className={`bar-fill ${c.budgetLevel(pct)}`} style={{ width: Math.min(pct, 100) + '%' }} /></div>
              <div className={`small ${remaining < 0 ? 'neg' : 'muted'}`}>{remaining < 0 ? `${money(-remaining)} over budget` : `${money(remaining)} left`} · {pct}% used</div></li>)}</ul>}</Preview></div>

      <section className="section"><h2>This month at a glance</h2><div className="glance">
        <div><div className="muted">Highest spending category</div>{top ? <><div className="v"><CategoryLabel id={top.categoryId} categories={categories} /> · {money(top.amount)}</div><div className="muted small">{Math.round((top.amount / expenses) * 100)}% of this month's expenses</div></> : <div className="v">No expenses yet</div>}</div>
        <div><div className="muted">Compared with {monthName(c.shiftMonth(CURRENT_MONTH, -1))}</div>{diff === null ? <div className="v">No earlier data</div> : <><div className="v">{Math.abs(diff)}% {diff >= 0 ? 'less' : 'more'} spent</div><div className="muted small">{money(expenses)} so far, {money(prevExp)} last month</div></>}</div>
        <div><div className="muted">Budget status</div>{rows.length ? <><div className="v">{within === rows.length ? `All ${rows.length} within limit` : `${within} of ${rows.length} within limit`}</div>{worst.pct >= 80 && <div className="muted small">{name(worst.b.categoryId)} is at {worst.pct}%</div>}</> : <div className="v">No budgets set</div>}</div></div></section>
</>
  </>)
}
const Preview = ({ title, sub, to, action, tall, children }) => (
  <section className={'preview' + (tall ? ' tall' : '')} aria-label={title}><div className="preview-body"><h2>{title}</h2>{sub && <p className="muted small">{sub}</p>}{children}</div>
    <Link to={to} className="preview-foot">{action}<ChevronRight size={16} aria-hidden="true" /></Link></section>)
