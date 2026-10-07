import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { money, monthLabel } from '../utils/format.js'
import * as c from '../utils/calc.js'
import { CURRENT_MONTH } from '../utils/dates.js'
import { PageHeader, EmptyState, ConfirmDialog } from '../components/ui.jsx'
export const budgetMonths = (txs, budgets) => c.allMonths(txs, [...budgets.map((b) => b.month), CURRENT_MONTH, c.shiftMonth(CURRENT_MONTH, 1)])
export default function Budgets() {
  const { budgets, transactions, categories, deleteBudget, notify } = useApp(), [month, setMonth] = useState(CURRENT_MONTH), [del, setDel] = useState(null)
  const name = (id) => categories.find((x) => x.id === id)?.name ?? 'Uncategorized'
  const rows = budgets.filter((b) => b.month === month).map((b) => ({ b, spent: c.calculateBudgetSpent(b, transactions), remaining: c.calculateBudgetRemaining(b, transactions), pct: c.calculateBudgetPercentage(b, transactions) }))
  const total = (k) => rows.reduce((s, r) => s + (k === 'b' ? r.b.amount : r[k]), 0)
  const warn = rows.filter((r) => r.pct >= 80)
  return (<>
    <PageHeader title="Budgets" subtitle="Monthly limits and what is left"><Link className="btn btn-primary" to="/budgets/new">Create budget</Link></PageHeader>
    <div className="toolbar" style={{ alignItems: 'center' }}><select className="input" style={{ flex: '0 0 200px' }} aria-label="Month" value={month} onChange={(e) => setMonth(e.target.value)}>{budgetMonths(transactions, budgets).reverse().map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select>
      {rows.length > 0 && <span className="muted">Budgeted {money(total('b'))} · Spent {money(total('spent'))} · Remaining {money(total('remaining'))}</span>}</div>
    {warn.map((r) => <p key={r.b.id} className={r.pct > 100 ? 'neg' : 'warnline'} style={{ marginBottom: 4 }}>{name(r.b.categoryId)} {r.pct > 100 ? `is over budget by ${money(-r.remaining)}.` : `has used ${r.pct}% of its budget.`}</p>)}
    {rows.length === 0 ? <EmptyState title="No budgets created" text="Set a monthly limit for a category to see what is left." to="/budgets/new" action="Create budget" /> :
      <table className="table" style={{ marginTop: 16 }}><thead><tr><th className="label">Category</th><th className="label amount">Budget</th><th className="label amount hide-m">Spent</th><th className="label amount hide-m">Remaining</th><th className="label">Progress</th><th className="label">Actions</th></tr></thead>
        <tbody>{rows.map(({ b, spent, remaining, pct }) => <tr key={b.id} className="row"><td>{name(b.categoryId)}</td><td className="amount">{money(b.amount)}</td><td className="amount hide-m">{money(spent)}</td>
          <td className={`amount hide-m ${remaining < 0 ? 'neg' : ''}`}>{remaining < 0 ? `−${money(-remaining)}` : money(remaining)}</td>
          <td><div className="progress"><div className="bar" role="progressbar" aria-valuenow={Math.min(pct, 100)} aria-valuemin="0" aria-valuemax="100" aria-label={`${name(b.categoryId)} budget used`}><div className={`bar-fill ${c.budgetLevel(pct)}`} style={{ width: Math.min(pct, 100) + '%' }} /></div><span className="pct">{pct}%</span></div></td>
          <td><div className="form-actions" style={{ gap: 12 }}><Link to={`/budgets/${b.id}/edit`}>Edit</Link><button className="btn-link danger" onClick={() => setDel(b)}>Delete</button></div></td></tr>)}</tbody></table>}
    {del && <ConfirmDialog title="Delete budget?" confirmLabel="Delete budget" onCancel={() => setDel(null)} onConfirm={async () => { const e = await deleteBudget(del.id); setDel(null); notify(e || 'Budget deleted.') }}>
      <p className="muted">{name(del.categoryId)}, {money(del.amount)}, {monthLabel(del.month)}.</p><p>This action cannot be undone.</p></ConfirmDialog>}
  </>)
}
