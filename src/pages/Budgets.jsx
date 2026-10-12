import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Trash2, PiggyBank, AlertTriangle, ChevronDown } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { money, monthLabel } from '../utils/format.js'
import * as c from '../utils/calc.js'
import { CURRENT_MONTH } from '../utils/dates.js'
import { PageHeader, EmptyState, ConfirmDialog, RowMenu } from '../components/ui.jsx'
import { colorHex } from '../utils/colors.js'
export const budgetMonths = (txs, budgets) => c.allMonths(txs, [...budgets.map((b) => b.month), CURRENT_MONTH, c.shiftMonth(CURRENT_MONTH, 1)])
export default function Budgets() {
  const { budgets, transactions, categories, deleteBudget, notify } = useApp(), [month, setMonth] = useState(CURRENT_MONTH), [del, setDel] = useState(null)
  const name = (id) => categories.find((x) => x.id === id)?.name ?? 'Uncategorized'
  const rows = budgets.filter((b) => b.month === month).map((b) => ({ b, spent: c.calculateBudgetSpent(b, transactions), remaining: c.calculateBudgetRemaining(b, transactions), pct: c.calculateBudgetPercentage(b, transactions) }))
  const total = (k) => rows.reduce((s, r) => s + (k === 'b' ? r.b.amount : r[k]), 0)
  const warn = rows.filter((r) => r.pct >= 80), dotOf = (id) => colorHex(categories.find((x) => x.id === id)?.color)
  return (<>
    <PageHeader title="Budgets"><label className="month-pick"><span className="sr-only">Month</span><select aria-label="Month" value={month} onChange={(e) => setMonth(e.target.value)}>{budgetMonths(transactions, budgets).reverse().map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select><ChevronDown size={16} aria-hidden="true" /></label><Link className="btn btn-primary" to="/budgets/new">Create budget</Link></PageHeader>
    {rows.length > 0 && <section className="card budget-summary" aria-label="Budget summary"><div className="bs-remaining"><div className="muted small">Remaining</div><div className={'bs-big' + (total('remaining') < 0 ? ' neg' : '')}>{total('remaining') < 0 ? '−' : ''}{money(Math.abs(total('remaining')))}</div></div>
      <div className="bs-totals muted"><span>Budgeted <strong>{money(total('b'))}</strong></span><span>Spent <strong>{money(total('spent'))}</strong></span></div></section>}
    {warn.length > 0 && <div className="alert-strip" role="status"><AlertTriangle size={18} aria-hidden="true" /><div>{warn.map((r) => <p key={r.b.id} className={r.pct > 100 ? 'neg' : 'warnline'}>{name(r.b.categoryId)} {r.pct > 100 ? `is over budget by ${money(-r.remaining)}.` : `has used ${r.pct}% of its budget.`}</p>)}</div></div>}
    {rows.length === 0 ? <EmptyState icon={PiggyBank} title="No budgets created" text="Set a monthly spending limit for a category to see how much is left." to="/budgets/new" action="Create budget" /> :
      <section className="card budget-list" aria-label={`Budgets for ${monthLabel(month)}`}><ul className="bud-rows">{rows.map(({ b, spent, remaining, pct }) => <li key={b.id} className="bud-row">
        <div className="bud-top"><span className="bud-name"><span className="dot" style={{ background: dotOf(b.categoryId) }} aria-hidden="true" />{name(b.categoryId)}</span><span className="muted small bud-amt">{money(spent)} of {money(b.amount)}</span>
          <RowMenu label={`Budget options for ${name(b.categoryId)}`} items={[{ label: 'Edit budget', icon: Pencil, to: `/budgets/${b.id}/edit` }, { label: 'Delete budget', icon: Trash2, danger: true, onSelect: () => setDel(b) }]} /></div>
        <div className="bar" role="progressbar" aria-valuenow={Math.min(pct, 100)} aria-valuemin="0" aria-valuemax="100" aria-label={`${name(b.categoryId)} budget used`}><div className={`bar-fill ${c.budgetLevel(pct)}`} style={{ width: Math.min(pct, 100) + '%' }} /></div>
        <div className={`small bp-note ${remaining < 0 ? 'neg' : 'muted'}`}>{remaining < 0 ? `${money(-remaining)} over budget` : `${money(remaining)} left`} · {pct}% used</div></li>)}</ul></section>}
    {del && <ConfirmDialog title="Delete budget?" confirmLabel="Delete budget" onCancel={() => setDel(null)} onConfirm={async () => { const e = await deleteBudget(del.id); setDel(null); notify(e || 'Budget deleted.') }}>
      <p className="muted">{name(del.categoryId)}, {money(del.amount)}, {monthLabel(del.month)}.</p><p>This action cannot be undone.</p></ConfirmDialog>}
  </>)
}
