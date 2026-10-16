import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { TODAY } from '../utils/dates.js'
import { formatDate, money, signed, txLabel } from '../utils/format.js'
import { computeLedger, ledgerProblem, bucketAmount } from '../utils/ledger.js'
import { PageHeader, Field, Segmented, DeleteTransactionDialog, ErrorState, focusFirstInvalid } from '../components/ui.jsx'
import CategoryDialog from '../components/CategoryDialog.jsx'
const NEW_CATEGORY = '__new__' // sentinel option value; it is never stored in the form state
// What each choice of balance means, shown under the selector. Income: where the money goes. Expense: where it is paid from.
const BALANCE_HINT = {
  income: { current: 'Add this income to your available spending balance.', savings: 'Send this income directly to your savings balance.' },
  expense: { current: 'Pay this expense from your available spending balance.', savings: 'Pay this expense from Savings. It still counts as an expense in your reports and budgets.' },
}
export default function TransactionForm() {
  const { id } = useParams(), nav = useNavigate(), { transactions, categories, saveTransaction, deleteTransaction, notify, settings, goals, activeGoals, transfers, reallocations, savingsReady } = useApp()
  const existing = id ? transactions.find((t) => t.id === id) : null
  const [f, setF] = useState(() => (existing ? { ...existing, amount: String(existing.amount) } : { type: 'expense', amount: '', categoryId: '', description: '', date: TODAY, notes: '', balance: 'current', goalId: '' }))
  const [err, setErr] = useState({}), [saving, setSaving] = useState(false), [confirm, setConfirm] = useState(false), [addCat, setAddCat] = useState(false)
  if (id && !existing) return <ErrorState title="Transaction not found" text="It may have been deleted." />
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  // The ledger without this transaction: what each bucket holds before it is applied (so editing never counts the old version twice).
  const others = transactions.filter((t) => t.id !== existing?.id), base = computeLedger({ transactions: others, transfers, reallocations, goals })
  const goalChoices = activeGoals.concat(goals.filter((g) => g.archived && g.id === f.goalId)) // an old transaction can still point at a deleted goal
  const submit = async (e) => {
    e.preventDefault(); if (saving) return; const er = {}, amt = Number(f.amount)
    if (!f.amount || Number.isNaN(amt)) er.amount = 'Enter an amount.'; else if (amt <= 0) er.amount = 'Enter an amount above zero.'
    if (!f.date) er.date = 'Choose a date.'
    // Early, friendly version of the database check: would this leave a goal or General Savings below zero? (The database still decides.)
    if (!Object.keys(er).length && savingsReady && (f.balance === 'savings' || existing?.balance === 'savings')) {
      const problem = ledgerProblem(computeLedger({ transactions: [...others, { ...f, amount: amt, id: 'preview' }], transfers, reallocations, goals }), goals)
      if (problem) { if (f.balance === 'savings') er.goal = problem; else er.form = problem }
    }
    setErr(er); if (Object.keys(er).length) return focusFirstInvalid()
    setSaving(true)
    const error = await saveTransaction({ ...f, id: existing?.id || 'new', amount: amt, description: f.description.trim(), balance: f.balance, goalId: f.balance === 'savings' ? f.goalId : '' })
    if (error) { setSaving(false); setErr({ form: error }); return }
    notify(existing ? 'Transaction updated successfully.' : 'Transaction saved successfully.'); nav(existing ? `/transactions/${existing.id}` : '/transactions')
  }
  const bad = (k) => !!err[k]
  return (<>
    <PageHeader title={existing ? 'Edit transaction' : 'New transaction'} />
    <form className={'form tx-form' + (savingsReady ? ' has-bal' : '')} onSubmit={submit} noValidate>
      <Field label="Type"><Segmented label="Type" value={f.type} onChange={(type) => setF({ ...f, type, categoryId: '' })} options={[['expense', 'Expense'], ['income', 'Income']]} /></Field>
      {savingsReady && <Field className="f-bal" label={f.type === 'income' ? 'Add to' : 'Paid from'} hint={BALANCE_HINT[f.type][f.balance]}><Segmented label={f.type === 'income' ? 'Add to' : 'Paid from'} value={f.balance} onChange={(balance) => { setF({ ...f, balance, goalId: '' }); setErr(({ goal, ...rest }) => rest) }} options={[['current', 'Current Balance'], ['savings', 'Savings']]} /></Field>}
      {savingsReady && f.balance === 'savings' && <Field className="f-goal" label="Savings goal (optional)" error={err.goal} hint={goalChoices.length === 0 ? 'You have no savings goals yet, so this goes to General Savings. You can create goals on the Savings page.' : f.type === 'income' ? 'Leave as General Savings if this income is not for a particular goal.' : 'Choose the goal this expense uses. Without one, only unassigned Savings can be used.'}><select className="input" value={f.goalId} onChange={(e) => { set('goalId')(e); setErr(({ goal, ...rest }) => rest) }} aria-invalid={bad('goal')}><option value="">{f.type === 'expense' ? `General Savings / No specific goal (${money(base.unassigned)} unassigned)` : 'General Savings / No specific goal'}</option>{goalChoices.map((g) => <option key={g.id} value={g.id}>{g.name}{g.archived ? ' (deleted)' : ''}{f.type === 'expense' ? ` (${money(bucketAmount(base, g.id))} saved)` : ''}</option>)}</select></Field>}
      <Field className="f-amount" label={`Amount (${settings.currency})`} error={err.amount}><input className="input" type="number" step="0.01" inputMode="decimal" placeholder="0.00" value={f.amount} onChange={set('amount')} aria-invalid={bad('amount')} autoFocus={!existing} /></Field>
      <Field className="f-cat" label="Category (optional)" hint="Leave as None if you do not need one."><select className="input" value={f.categoryId} onChange={(e) => (e.target.value === NEW_CATEGORY ? setAddCat(true) : set('categoryId')(e))}><option value="">None</option>{categories.filter((c) => c.type === f.type).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}<option value={NEW_CATEGORY}>+ Add category</option></select></Field>
      <Field className="f-title" label="Transaction title (optional)" hint="A short name for this transaction. If left blank, the category name is shown."><input className="input" value={f.description} onChange={set('description')} /></Field>
      <Field className="f-date" label="Date" error={err.date}><input className="input" type="date" value={f.date} onChange={set('date')} aria-invalid={bad('date')} /></Field>
      <Field label="Notes (optional)"><textarea className="input" value={f.notes} onChange={set('notes')} placeholder="Add a note" /></Field>
      {err.form && <p className="field-error" role="alert">{err.form}</p>}
      <div className="form-actions"><button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : existing ? 'Save changes' : 'Save transaction'}</button>
        <button type="button" className="btn" onClick={() => nav(-1)}>Cancel</button>
        {existing && <button type="button" className="btn btn-danger push" onClick={() => setConfirm(true)}>Delete transaction</button>}</div></form>
    {addCat && <CategoryDialog type={f.type} onClose={() => setAddCat(false)} onCreated={(c) => { setF((x) => ({ ...x, categoryId: c.id })); setAddCat(false) }} />}
    {confirm && <DeleteTransactionDialog summary={`${txLabel(existing, categories)}, ${signed(existing.amount, existing.type)}, ${formatDate(existing.date)}.`} onCancel={() => setConfirm(false)} onConfirm={async () => { const e = await deleteTransaction(existing.id); if (e) { setConfirm(false); setErr({ form: e }); return } notify('Transaction deleted.'); nav('/transactions') }} />}
  </>)
}
