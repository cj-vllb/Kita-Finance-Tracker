import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Trash2, PiggyBank, AlertTriangle, ChevronDown, Pencil, Info, Plus } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { money, monthLabel } from '../utils/format.js'
import * as c from '../utils/calc.js'
import { CURRENT_MONTH } from '../utils/dates.js'
import { PageHeader, EmptyState, ConfirmDialog, RowMenu, CategoryIcon } from '../components/ui.jsx'
import BudgetModal from '../components/BudgetModal.jsx'
import { colorHex } from '../utils/colors.js'
import { PRESET_EXPENSE } from '../data/presetCategories.js'
import { budgetMonths } from '../utils/budgetMonths.js'
export { budgetMonths }
export default function Budgets() {
  const { budgets, transactions, categories, deleteBudget, notify } = useApp(), [sp, setSp] = useSearchParams()
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
  // Built-in expense categories the user still has and has NOT budgeted this month. They are only offered here: nothing is stored until a budget is saved,
  // so they never count as zero-value budgets.
  const available = PRESET_EXPENSE.map((p) => ({ p, cat: categories.find((x) => x.presetKey === p.key && !x.archived) })).filter(({ cat }) => cat && !budgets.some((b) => b.month === month && b.categoryId === cat.id))
  const editing = modal?.mode === 'edit' ? budgets.find((b) => b.id === modal.id) : null
  const open = (m) => setModal(m)
  return (<>
    <PageHeader title="Budgets"><label className="month-pick"><span className="sr-only">Month</span><select aria-label="Month" value={month} onChange={(e) => setMonth(e.target.value)}>{budgetMonths(transactions, budgets).reverse().map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select><ChevronDown size={16} aria-hidden="true" /></label><button type="button" className="btn btn-primary" onClick={() => open({ mode: 'create' })}>Create budget</button></PageHeader>
    {rows.length > 0 && <section className="card budget-summary" aria-label="Budget summary"><div className="bs-remaining"><div className="muted small">Remaining</div><div className={'bs-big' + (total('remaining') < 0 ? ' neg' : '')}>{total('remaining') < 0 ? '−' : ''}{money(Math.abs(total('remaining')))}</div></div>
      <div className="bs-totals muted"><span>Budgeted <strong>{money(total('b'))}</strong></span><span>Spent <strong>{money(total('spent'))}</strong></span></div></section>}
    {warn.length > 0 && <div className="alert-strip" role="status"><AlertTriangle size={18} aria-hidden="true" /><div>{warn.map((r) => <p key={r.b.id} className={r.pct > 100 ? 'neg' : 'warnline'}>{nameOf(r.b)} {r.pct > 100 ? `is over budget by ${money(-r.remaining)}.` : `has used ${r.pct}% of its budget.`}</p>)}</div></div>}
    <h2 className="bud-section-title">Active budgets for {monthLabel(month)}</h2>
    {rows.length === 0 ? <EmptyState compact icon={PiggyBank} title="No budgets for this month" text="Pick a category below, or create your own budget, to set a monthly limit." /> :
      <section className="card budget-list" aria-label={`Budgets for ${monthLabel(month)}`}><ul className="bud-rows">{rows.map(({ b, spent, remaining, pct }) => <li key={b.id} className="bud-row">
        <div className="bud-top"><span className="bud-name"><span className="bud-icon" style={{ '--cat': colorHex(catOf(b.categoryId)?.color) }}><CategoryIcon id={iconOf(b)} size={18} /></span>{nameOf(b)}</span><span className="muted small bud-amt">{money(spent)} of {money(b.amount)}</span>
          <RowMenu label={`Budget options for ${nameOf(b)}`} items={[{ label: 'Edit budget', icon: Pencil, onSelect: () => open({ mode: 'edit', id: b.id }) }, { label: 'Delete budget', icon: Trash2, danger: true, onSelect: () => setDel(b) }]} /></div>
        <div className="bar" role="progressbar" aria-valuenow={Math.min(pct, 100)} aria-valuemin="0" aria-valuemax="100" aria-label={`${nameOf(b)} budget used`}><div className={`bar-fill ${c.budgetLevel(pct)}`} style={{ width: Math.min(pct, 100) + '%' }} /></div>
        {b.categoryId ? <div className={`small bp-note ${remaining < 0 ? 'neg' : 'muted'}`}>{remaining < 0 ? `${money(-remaining)} over budget` : `${money(remaining)} left`} · {pct}% used</div>
          : <div className="small bp-note muted"><Info size={13} aria-hidden="true" /> Budget only: spending is not tracked. Edit it to link an expense category.</div>}</li>)}</ul></section>}
    {available.length > 0 && <section aria-labelledby="bud-avail"><h2 className="bud-section-title" id="bud-avail">Available to budget</h2>
      <p className="muted small bud-avail-note">These categories have no budget in {monthLabel(month)}. They only count once you set an amount.</p>
      <ul className="bud-avail">{available.map(({ p, cat }) => <li key={p.key}><button type="button" className="bud-avail-item" onClick={() => open({ mode: 'create', preset: { categoryId: cat.id, name: cat.name, icon: catOf(cat.id)?.icon || p.icon } })}>
        <span className="bud-icon" style={{ '--cat': colorHex(cat.color) }}><CategoryIcon id={cat.icon || p.icon} size={18} /></span><span className="bud-avail-name">{cat.name}</span><span className="bud-avail-cta"><Plus size={14} aria-hidden="true" />Set budget</span></button></li>)}</ul></section>}
    {modal && (modal.mode === 'create' || editing) && <BudgetModal budget={editing || undefined} preset={modal.preset} month={month} onClose={() => setModal(null)} />}
    {del && <ConfirmDialog title="Delete budget?" confirmLabel="Delete budget" onCancel={() => setDel(null)} onConfirm={async () => { const e = await deleteBudget(del.id); setDel(null); notify(e || 'Budget deleted.') }}>
      <p className="muted">{nameOf(del)}, {money(del.amount)}, {monthLabel(del.month)}.</p><p>This action cannot be undone.</p></ConfirmDialog>}
  </>)
}
