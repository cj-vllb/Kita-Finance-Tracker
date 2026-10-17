import { useRef, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { Modal, Field, focusFirstInvalid } from './ui.jsx'
import IconPicker from './IconPicker.jsx'
import { monthLabel } from '../utils/format.js'
import { evaluateAmount } from '../utils/expression.js'
import { isValidIconId } from '../utils/icons.js'
import { budgetMonths } from '../utils/budgetMonths.js'
const DEFAULT_ICON = 'piggy-bank'
// Create or edit one monthly budget. A budget is either linked to an EXPENSE category (its spending is read from that category's transactions)
// or budget-only (own name and icon, no spending is tracked). Creating a budget never creates a category.
export default function BudgetModal({ budget, preset, month, onClose }) {
  const { budgets, categories, activeCategories, transactions, saveBudget, notify, settings, dataToolsReady } = useApp(), edit = !!budget, input = useRef(), amountRef = useRef()
  const catOf = (id) => categories.find((c) => c.id === id)
  const startCat = budget?.categoryId || preset?.categoryId || ''
  const [f, setF] = useState(() => ({
    name: budget ? (budget.name || catOf(budget.categoryId)?.name || '') : (preset?.name || ''),
    amount: budget ? String(budget.amount) : '', month: budget?.month || month,
    categoryId: startCat, icon: isValidIconId(budget?.icon) ? budget.icon : (preset?.icon || (isValidIconId(catOf(startCat)?.icon) ? catOf(startCat).icon : DEFAULT_ICON)),
  }))
  const [touched, setTouched] = useState(!!budget || !!preset), [err, setErr] = useState({}), [saving, setSaving] = useState(false)
  const expenseCats = activeCategories.filter((c) => c.type === 'expense').concat(catOf(startCat) && catOf(startCat).archived ? [catOf(startCat)] : [])
  const pickCategory = (id) => {
    const c = catOf(id)
    setF((x) => ({ ...x, categoryId: id, ...(c && !touched ? { name: c.name, icon: isValidIconId(c.icon) ? c.icon : x.icon } : {}) })); setErr({})
  }
  const submit = async (dismiss) => {
    if (saving) return
    const er = {}, name = f.name.trim(), cat = catOf(f.categoryId), calc = evaluateAmount(f.amount)
    if (!f.categoryId && !name) er.name = 'Enter a name for this budget.'
    if (name.length > 40) er.name = 'Use 40 characters or fewer.'
    if (!f.categoryId && !dataToolsReady) er.category = 'Budget-only budgets need the latest database update. Choose an expense category for now.'
    if (!f.amount.trim()) er.amount = 'Enter a monthly amount.'; else if (!calc.ok) er.amount = calc.error.replace('Enter an amount above zero.', 'Budget amount must be greater than zero.')
    if (!er.name && !er.category) {
      const dup = budgets.some((b) => b.id !== budget?.id && b.month === f.month && (f.categoryId ? b.categoryId === f.categoryId : !b.categoryId && (b.name || '').trim().toLowerCase() === name.toLowerCase()))
      if (dup) er[f.categoryId ? 'category' : 'name'] = f.categoryId ? 'This category already has a budget for that month. Edit it instead.' : 'You already have a budget with this name for that month.'
    }
    setErr(er); if (Object.keys(er).length) return focusFirstInvalid()
    setSaving(true)
    const error = await saveBudget({ id: budget?.id || 'new', categoryId: f.categoryId, amount: calc.amount, month: f.month, name: cat && name === cat.name ? '' : name, icon: f.icon })
    if (error) { setSaving(false); setErr({ form: error }); return }
    notify('Budget saved successfully.'); dismiss()
  }
  const linked = !!f.categoryId
  return (<Modal title={edit ? 'Edit budget' : 'Create budget'} onClose={onClose} initialFocus={preset ? amountRef : input} wide labelledBy="bud-modal-title"
    footer={(dismiss) => (<><button type="button" className="btn" onClick={dismiss}>Cancel</button><button type="button" className="btn btn-primary" disabled={saving} onClick={() => submit(dismiss)}>{saving ? 'Saving...' : edit ? 'Save' : 'Create'}</button></>)}>
    <Field label="Budget name" error={err.name} hint={linked ? 'Leave as is to use the category name.' : undefined}><input ref={input} className="input" value={f.name} maxLength={60} onChange={(e) => { setTouched(true); setF({ ...f, name: e.target.value }); setErr({}) }} aria-invalid={!!err.name} autoComplete="off" /></Field>
    <Field label={`Monthly amount (${settings.currency})`} error={err.amount}><input ref={amountRef} className="input" type="number" step="0.01" inputMode="decimal" placeholder="0.00" value={f.amount} onChange={(e) => { setF({ ...f, amount: e.target.value }); setErr({}) }} aria-invalid={!!err.amount} /></Field>
    <Field label="Month"><select className="input" value={f.month} onChange={(e) => setF({ ...f, month: e.target.value })}>{budgetMonths(transactions, budgets).concat(f.month).filter((m, i, a) => a.indexOf(m) === i).sort().reverse().map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select></Field>
    <Field label="Track spending from (optional)" error={err.category}
      hint={linked ? 'Spending in this expense category counts against the budget. No category is created or changed.' : 'Not linked: this budget stays at its full amount because no spending is counted. Pick an expense category to track its spending.'}>
      <select className="input" value={f.categoryId} onChange={(e) => pickCategory(e.target.value)} aria-invalid={!!err.category}><option value="">None (budget only)</option>{expenseCats.map((c) => <option key={c.id} value={c.id}>{c.name}{c.archived ? ' (deleted)' : ''}</option>)}</select></Field>
    <div className="field"><span className="field-label">Icon</span><IconPicker value={f.icon} onChange={(icon) => setF({ ...f, icon })} /></div>
    {err.form && <p className="field-error" role="alert">{err.form}</p>}</Modal>)
}
