import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { TODAY } from '../utils/dates.js'
import { formatDate, signed, txLabel } from '../utils/format.js'
import { PageHeader, Field, Segmented, DeleteTransactionDialog, ErrorState, focusFirstInvalid } from '../components/ui.jsx'
import CategoryDialog from '../components/CategoryDialog.jsx'
const NEW_CATEGORY = '__new__' // sentinel option value; it is never stored in the form state
export default function TransactionForm() {
  const { id } = useParams(), nav = useNavigate(), { transactions, categories, saveTransaction, deleteTransaction, notify, settings } = useApp()
  const existing = id ? transactions.find((t) => t.id === id) : null
  const [f, setF] = useState(() => (existing ? { ...existing, amount: String(existing.amount) } : { type: 'expense', amount: '', categoryId: '', description: '', date: TODAY, notes: '' }))
  const [err, setErr] = useState({}), [saving, setSaving] = useState(false), [confirm, setConfirm] = useState(false), [addCat, setAddCat] = useState(false)
  if (id && !existing) return <ErrorState title="Transaction not found" text="It may have been deleted." />
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault(); const er = {}, amt = Number(f.amount)
    if (!f.amount || Number.isNaN(amt)) er.amount = 'Enter an amount.'; else if (amt <= 0) er.amount = 'Enter an amount above zero.'
    if (!f.date) er.date = 'Choose a date.'
    setErr(er); if (Object.keys(er).length) return focusFirstInvalid()
    setSaving(true)
    const error = await saveTransaction({ ...f, id: existing?.id || 'new', amount: amt, description: f.description.trim() })
    if (error) { setSaving(false); setErr({ form: error }); return }
    notify(existing ? 'Transaction updated successfully.' : 'Transaction saved successfully.'); nav(existing ? `/transactions/${existing.id}` : '/transactions')
  }
  const bad = (k) => !!err[k]
  return (<>
    <PageHeader title={existing ? 'Edit transaction' : 'New transaction'} subtitle={existing ? 'Changes apply to your records and reports straight away.' : 'Record money coming in or going out.'} />
    <form className="form" onSubmit={submit} noValidate>
      <Field label="Type"><Segmented label="Type" value={f.type} onChange={(type) => setF({ ...f, type, categoryId: '' })} options={[['expense', 'Expense'], ['income', 'Income']]} /></Field>
      <Field label={`Amount (${settings.currency})`} error={err.amount}><input className="input" type="number" step="0.01" inputMode="decimal" placeholder="0.00" value={f.amount} onChange={set('amount')} aria-invalid={bad('amount')} autoFocus={!existing} /></Field>
      <Field label="Category (optional)" hint="Leave as None if you do not need one."><select className="input" value={f.categoryId} onChange={(e) => (e.target.value === NEW_CATEGORY ? setAddCat(true) : set('categoryId')(e))}><option value="">None</option>{categories.filter((c) => c.type === f.type).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}<option value={NEW_CATEGORY}>+ Add category</option></select></Field>
      <Field label="Description (optional)"><input className="input" value={f.description} onChange={set('description')} /></Field>
      <Field label="Date" error={err.date}><input className="input" type="date" value={f.date} onChange={set('date')} aria-invalid={bad('date')} /></Field>
      <Field label="Notes (optional)"><textarea className="input" value={f.notes} onChange={set('notes')} placeholder="Add a note" /></Field>
      {err.form && <p className="field-error" role="alert">{err.form}</p>}
      <div className="form-actions"><button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : existing ? 'Save changes' : 'Save transaction'}</button>
        <button type="button" className="btn" onClick={() => nav(-1)}>Cancel</button>
        {existing && <button type="button" className="btn btn-danger push" onClick={() => setConfirm(true)}>Delete transaction</button>}</div></form>
    {addCat && <CategoryDialog type={f.type} onClose={() => setAddCat(false)} onCreated={(c) => { setF((x) => ({ ...x, categoryId: c.id })); setAddCat(false) }} />}
    {confirm && <DeleteTransactionDialog summary={`${txLabel(existing, categories)}, ${signed(existing.amount, existing.type)}, ${formatDate(existing.date)}.`} onCancel={() => setConfirm(false)} onConfirm={async () => { const e = await deleteTransaction(existing.id); if (e) { setConfirm(false); setErr({ form: e }); return } notify('Transaction deleted.'); nav('/transactions') }} />}
  </>)
}
