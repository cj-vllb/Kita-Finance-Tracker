import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { monthLabel } from '../utils/format.js'
import { CURRENT_MONTH } from '../utils/dates.js'
import { PageHeader, Field, ErrorState } from '../components/ui.jsx'
import { budgetMonths } from './Budgets.jsx'
export default function BudgetForm() {
  const { id } = useParams(), nav = useNavigate(), { budgets, categories, transactions, saveBudget, notify } = useApp(), existing = id ? budgets.find((b) => b.id === id) : null
  const [f, setF] = useState(() => (existing ? { ...existing, amount: String(existing.amount) } : { categoryId: '', amount: '', month: CURRENT_MONTH })), [err, setErr] = useState({}), [saving, setSaving] = useState(false)
  if (id && !existing) return <ErrorState title="Budget not found" text="It may have been deleted." />
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault(); const er = {}, amt = Number(f.amount)
    if (!f.categoryId) er.categoryId = 'Choose a category for this budget.'
    if (!f.amount) er.amount = 'Enter a monthly amount.'; else if (!(amt > 0)) er.amount = 'Budget amount must be greater than zero.'
    if (f.categoryId && budgets.some((b) => b.id !== existing?.id && b.categoryId === f.categoryId && b.month === f.month)) er.categoryId = 'This category already has a budget for that month. Edit it instead.'
    setErr(er); if (Object.keys(er).length) return
    setSaving(true); const error = await saveBudget({ id: existing?.id || 'new', categoryId: f.categoryId, amount: amt, month: f.month }); if (error) { setSaving(false); setErr({ form: error }); return } notify('Budget saved successfully.'); nav('/budgets')
  }
  return (<>
    <PageHeader title={existing ? 'Edit budget' : 'Create budget'} subtitle="Set a monthly limit for one category." />
    <form className="form" onSubmit={submit} noValidate>
      <Field label="Category" error={err.categoryId}><select className="input" value={f.categoryId} onChange={set('categoryId')} aria-invalid={!!err.categoryId}><option value="">Choose a category</option>{categories.filter((c) => c.type === 'expense').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      <Field label="Monthly amount" error={err.amount}><input className="input" type="number" step="0.01" inputMode="decimal" placeholder="0.00" value={f.amount} onChange={set('amount')} aria-invalid={!!err.amount} /></Field>
      <Field label="Month"><select className="input" value={f.month} onChange={set('month')}>{budgetMonths(transactions, budgets).reverse().map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select></Field>
      {err.form && <p className="field-error" role="alert">{err.form}</p>}
      <div className="form-actions"><button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save budget'}</button><button type="button" className="btn" onClick={() => nav('/budgets')}>Cancel</button></div></form></>)
}
