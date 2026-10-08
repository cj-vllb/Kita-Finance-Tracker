import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { money, monthLabel, monthName, monthShort } from '../utils/format.js'
import * as c from '../utils/calc.js'
import { CURRENT_MONTH } from '../utils/dates.js'
import { PageHeader, EmptyState, LoadingState, useLoading } from '../components/ui.jsx'
import { BarChart } from '../components/charts.jsx'
export default function Reports() {
  const { transactions, categories } = useApp(), loading = useLoading(300), [month, setMonth] = useState(CURRENT_MONTH)
  const months = c.allMonths(transactions, [CURRENT_MONTH]).filter((m) => m <= CURRENT_MONTH)
  const idx = Math.max(0, months.indexOf(month)), range = months.slice(Math.max(0, idx - 5), idx + 1)
  if (!transactions.length) return <><PageHeader title="Reports" subtitle="Look at patterns over time" /><EmptyState title="No report data available" text="Add transactions and your reports will fill in." to="/transactions/new" action="Add transaction" /></>
  const data = c.groupTransactionsByMonth(transactions, range), cur = data.at(-1), m = c.inMonth(transactions, month)
  const avg = Math.round(data.reduce((s, d) => s + d.expenses, 0) / data.length), cats = c.groupExpensesByCategory(m), name = (id) => categories.find((x) => x.id === id)?.name ?? 'Uncategorized'
  const pm = c.shiftMonth(month, -1), pe = c.calculateExpenses(c.inMonth(transactions, pm)), diff = pe ? Math.round((1 - cur.expenses / pe) * 100) : null
  const sign = (n) => (n >= 0 ? '+' : '−') + money(Math.abs(n))
  return (<>
    <PageHeader title="Reports" subtitle="Look at patterns over time"><select className="input" aria-label="Month" value={month} onChange={(e) => setMonth(e.target.value)}>{[...months].reverse().map((x) => <option key={x} value={x}>{monthLabel(x)}</option>)}</select></PageHeader>
    <p className="muted range-note">{monthShort(range[0])} to {monthLabel(range.at(-1))}</p>
    {loading ? <LoadingState rows={6} label="Loading report data..." /> : <>
      <div className="summary"><div><div className="muted">Income, {monthName(month)}</div><div className="big pos">+{money(cur.income)}</div></div>
        <div><div className="muted">Expenses, {monthName(month)}</div><div className="big neg">−{money(cur.expenses)}</div></div>
        <div><div className="muted">Net change, {monthName(month)}</div><div className="big">{sign(cur.net)}</div></div>
        <div><div className="muted">Average monthly expenses</div><div className="big">{money(avg)}</div></div></div>
      <section className="section"><h2>Income and expenses by month</h2><p className="muted small" style={{ marginBottom: 16 }}>Is spending staying below income?</p><BarChart data={data} /></section>
      <section className="section"><h2>Where the money went</h2><p className="muted small" style={{ marginBottom: 8 }}>{monthLabel(month)}, share of expenses</p>
        {cats.length === 0 ? <p className="muted">No expenses recorded for this month.</p> : cats.map((x) => { const pct = Math.round((x.amount / cur.expenses) * 100); return <div className="share-row" key={x.categoryId}><span>{name(x.categoryId)}</span><div className="bar" aria-hidden="true"><div className="bar-fill ok" style={{ width: pct + '%' }} /></div><span className="amount">{money(x.amount)}</span><span className="amount muted">{pct}%</span></div> })}</section>
      <section className="section"><h2>Month by month</h2><p className="muted small" style={{ marginBottom: 8 }}>Income, expenses, net</p>
        <div className="table-wrap"><table className="table stack"><caption className="sr-only">Income, expenses and net by month</caption><thead><tr><th className="label">Month</th><th className="label amount">Income</th><th className="label amount">Expenses</th><th className="label amount">Net</th></tr></thead>
          <tbody>{[...data].reverse().map((d) => <tr key={d.month} className="row"><td className="cell-title">{monthShort(d.month)}</td><td className="amount" data-label="Income">{money(d.income)}</td><td className="amount" data-label="Expenses">{money(d.expenses)}</td><td className={`amount ${d.net >= 0 ? 'pos' : 'neg'}`} data-label="Net">{sign(d.net)}</td></tr>)}</tbody></table></div></section>
      <p style={{ marginTop: 32 }}>{diff !== null && `Spending is ${Math.abs(diff)}% ${diff >= 0 ? 'lower' : 'higher'} than ${monthName(pm)}. `}{cats[0] && `${name(cats[0].categoryId)} is ${Math.round((cats[0].amount / cur.expenses) * 100)}% of this month's expenses.`}</p></>}
  </>)
}
