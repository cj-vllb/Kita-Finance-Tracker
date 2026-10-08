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
    <div className="toolbar budget-bar"><select className="input month-select" aria-label="Month" value={month} onChange={(e) => setMonth(e.target.value)}>{budgetMonths(transactions, budgets).reverse().map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select>
      {rows.length > 0 && <span className="muted budget-total">Budgeted {money(total('b'))} · Spent {money(total('spent'))} · Remaining {money(total('remaining'))}</span>}</div>
    {warn.map((r) => <p key={r.b.id} className={r.pct > 100 ? 'neg' : 'warnline'} style={{ marginBottom: 4 }}>{name(r.b.categoryId)} {r.pct > 100 ? `is over budget by ${money(-r.remaining)}.` : `has used ${r.pct}% of its budget.`}</p>)}
    {rows.length === 0 ? <EmptyState title="No budgets created" text="Set a monthly limit for a category to see what is left." to="/budgets/new" action="Create budget" /> :
      <div className="table-wrap"><table className="table stack" style={{ marginTop: 16 }}><caption className="sr-only">Budgets for {monthLabel(month)}</caption><thead><tr><th className="label">Category</th><th className="label amount">Budget</th><th className="label amount">Spent</th><th className="label amount">Remaining</th><th className="label">Progress</th><th className="label">Actions</th></tr></thead>
        <tbody>{rows.map(({ b, spent, remaining, pct }) => <tr key={b.id} className="row"><td className="cell-title">{name(b.categoryId)}</td><td className="amount" data-label="Budget">{money(b.amount)}</td><td className="amount" data-label="Spent">{money(spent)}</td>
          <td className={`amount ${remaining < 0 ? 'neg' : ''}`} data-label="Remaining">{remaining < 0 ? `−${money(-remaining)}` : money(remaining)}</td>
          <td className="cell-progress" data-label="Used"><div className="progress"><div className="bar" role="progressbar" aria-valuenow={Math.min(pct, 100)} aria-valuemin="0" aria-valuemax="100" aria-label={`${name(b.categoryId)} budget used`}><div className={`bar-fill ${c.budgetLevel(pct)}`} style={{ width: Math.min(pct, 100) + '%' }} /></div><span className="pct">{pct}%</span></div></td>
          <td className="cell-actions"><div className="act-links"><Link to={`/budgets/${b.id}/edit`} aria-label={`Edit ${name(b.categoryId)} budget`}>Edit</Link><button className="btn-link danger" aria-label={`Delete ${name(b.categoryId)} budget`} onClick={() => setDel(b)}>Delete</button></div></td></tr>)}</tbody></table></div>}
    {del && <ConfirmDialog title="Delete budget?" confirmLabel="Delete budget" onCancel={() => setDel(null)} onConfirm={async () => { const e = await deleteBudget(del.id); setDel(null); notify(e || 'Budget deleted.') }}>
      <p className="muted">{name(del.categoryId)}, {money(del.amount)}, {monthLabel(del.month)}.</p><p>This action cannot be undone.</p></ConfirmDialog>}
  </>)
}
