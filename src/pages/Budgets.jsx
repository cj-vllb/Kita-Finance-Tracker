import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Trash2, PiggyBank, AlertTriangle, Pencil, Info, Plus } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { money, monthLabel } from '../utils/format.js'
import * as c from '../utils/calc.js'
import { CURRENT_MONTH } from '../utils/dates.js'
import { PageHeader, EmptyState, ConfirmDialog, RowMenu, CategoryIcon } from '../components/ui.jsx'
import BudgetModal from '../components/BudgetModal.jsx'
import { categoryIconId } from '../utils/categories.js'
import { budgetMonths } from '../utils/budgetMonths.js'
export { budgetMonths }
export default function Budgets() {
  const { budgets, transactions, categories, activeCategories, deleteBudget, notify } = useApp(), [sp, setSp] = useSearchParams()
  const [month, setMonth] = useState(CURRENT_MONTH), [del, setDel] = useState(null)
  const [modal, setModal] = useState(() => (sp.has('new') ? { mode: 'create' } : sp.has('edit') ? { mode: 'edit', id: sp.get('edit') } : null)) // old /budgets/new and /budgets/:id/edit links land here
  useEffect(() => { if (sp.has('new') || sp.has('edit')) setSp({}, { replace: true }) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const catOf = (id) => categories.find((x) => x.id === id)
  const nameOf = (b) => b.name || catOf(b.categoryId)?.name || 'Budget'
  const iconOf = (b) => b.icon || catOf(b.categoryId)?.icon || 'piggy-bank'
  const rows = budgets.filter((b) => b.month === month).map((b) => ({ b, spent: c.calculateBudgetSpent(b, transactions), remaining: c.calculateBudgetRemaining(b, transactions), pct: c.calculateBudgetPercentage(b, transactions) }))
    .sort((x, y) => nameOf(x.b).localeCompare(nameOf(y.b))) // active budgets always come first, in a stable order
  const total = (k) => rows.reduce((s, r) => s + (k === 'b' ? r.b.amount : r[k]), 0)
  const warn = rows.filter((r) => r.pct >= 80 && r.b.categoryId)
  // EVERY active expense category the user has (built-in and their own) that has NOT been budgeted this month, in the usual order (built-ins first, then
  // custom ones as they were created). They are only offered here: nothing is stored until a budget is saved, so they never count as zero-value budgets,
  // and no category is created or copied. A new expense category shows up here by itself.
  const available = activeCategories.filter((cat) => cat.type === 'expense' && !budgets.some((b) => b.month === month && b.categoryId === cat.id))
  const editing = modal?.mode === 'edit' ? budgets.find((b) => b.id === modal.id) : null
  const open = (m) => setModal(m)
  return (<>
    <PageHeader title="Budget"><button type="button" className="btn btn-primary" onClick={() => open({ mode: 'create' })}>Create budget</button></PageHeader>
    {rows.length > 0 && <section className="card budget-summary" aria-label="Budget summary"><div className="bs-remaining"><div className="muted small">Remaining</div><div className={'bs-big' + (total('remaining') < 0 ? ' neg' : '')}>{total('remaining') < 0 ? '−' : ''}{money(Math.abs(total('remaining')))}</div></div>
      <div className="bs-totals muted"><span>Budgeted <strong>{money(total('b'))}</strong></span><span>Spent <strong>{money(total('spent'))}</strong></span></div></section>}
    {warn.length > 0 && <div className="alert-strip" role="status"><AlertTriangle size={18} aria-hidden="true" /><div>{warn.map((r) => <p key={r.b.id} className={r.pct > 100 ? 'neg' : 'warnline'}>{nameOf(r.b)} {r.pct > 100 ? `is over budget by ${money(-r.remaining)}.` : `has used ${r.pct}% of its budget.`}</p>)}</div></div>}
    <div className="bud-active-head"><h2 className="bud-section-title" id="bud-active-h">Active budgets for</h2>
      <label className="fsel bud-month"><span className="sr-only">Month</span><select className="input" aria-label="Month" value={month} onChange={(e) => setMonth(e.target.value)}>{budgetMonths(transactions, budgets).reverse().map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select></label></div>
    {rows.length === 0 ? <EmptyState compact icon={PiggyBank} title="No budgets for this month" text="Pick a category below, or create your own budget, to set a monthly limit." /> :
      <section className="card budget-list" aria-label={`Budgets for ${monthLabel(month)}`}><ul className="bud-rows">{rows.map(({ b, spent, remaining, pct }) => <li key={b.id} className="bud-row">
        <div className="bud-top"><span className="bud-name"><span className="bud-icon out"><CategoryIcon id={iconOf(b)} size={18} /></span><span className="bud-name-text">{nameOf(b)}</span></span><span className="muted small bud-amt">{money(spent)} of {money(b.amount)}</span>
          <RowMenu label={`Budget options for ${nameOf(b)}`} items={[{ label: 'Edit budget', icon: Pencil, onSelect: () => open({ mode: 'edit', id: b.id }) }, { label: 'Delete budget', icon: Trash2, danger: true, onSelect: () => setDel(b) }]} /></div>
        <div className="bar" role="progressbar" aria-valuenow={Math.min(pct, 100)} aria-valuemin="0" aria-valuemax="100" aria-label={`${nameOf(b)} budget used`}><div className={`bar-fill ${c.budgetLevel(pct)}`} style={{ width: Math.min(pct, 100) + '%' }} /></div>
        {b.categoryId ? <div className={`small bp-note ${remaining < 0 ? 'neg' : 'muted'}`}>{remaining < 0 ? `${money(-remaining)} over budget` : `${money(remaining)} left`} · {pct}% used</div>
          : <div className="small bp-note muted"><Info size={13} aria-hidden="true" /> Budget only: spending is not tracked. Edit it to link an expense category.</div>}</li>)}</ul></section>}
    {available.length > 0 && <section aria-labelledby="bud-avail"><h2 className="bud-section-title" id="bud-avail">Available to budget</h2>
      <p className="muted small bud-avail-note">These categories have no budget in {monthLabel(month)}. They only count once you set an amount.</p>
      <ul className="bud-avail">{available.map((cat) => <li key={cat.id}><button type="button" className="bud-avail-item" title={cat.name} onClick={() => open({ mode: 'create', preset: { categoryId: cat.id, name: cat.name, icon: categoryIconId(cat) || 'piggy-bank' } })}>
        <span className="bud-icon out"><CategoryIcon id={categoryIconId(cat)} size={18} /></span><span className="bud-avail-name">{cat.name}</span><span className="bud-avail-cta"><Plus size={14} aria-hidden="true" />Set budget</span></button></li>)}</ul></section>}
    {modal && (modal.mode === 'create' || editing) && <BudgetModal budget={editing || undefined} preset={modal.preset} month={month} onClose={() => setModal(null)} />}
    {del && <ConfirmDialog title="Delete budget?" confirmLabel="Delete budget" onCancel={() => setDel(null)} onConfirm={async () => { const e = await deleteBudget(del.id); setDel(null); notify(e || 'Budget deleted.') }}>
      <p className="muted">{nameOf(del)}, {money(del.amount)}, {monthLabel(del.month)}.</p><p>This action cannot be undone.</p></ConfirmDialog>}
  </>)
}
