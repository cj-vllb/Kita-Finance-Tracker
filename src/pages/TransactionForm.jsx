import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { TODAY } from '../utils/dates.js'
import { formatDate, money, signed, txLabel } from '../utils/format.js'
import { computeLedger, ledgerProblem, bucketAmount } from '../utils/ledger.js'
import { evaluateAmount } from '../utils/expression.js'
import { PageHeader, Field, Segmented, DeleteTransactionDialog, ErrorState, focusFirstInvalid } from '../components/ui.jsx'
import CategoryDialog from '../components/CategoryDialog.jsx'
import CategoryPicker from '../components/CategoryPicker.jsx'
import AmountInput from '../components/AmountInput.jsx'
const AMOUNT_TIP = 'You can type a calculation, for example 100+200.'
// Only the non-obvious case needs a note: money that goes to or comes from Savings still counts as income or an expense in reports and budgets.
const SAVINGS_HINT = { income: 'Still counts as income in your reports.', expense: 'Still counts as an expense in your reports and budgets.' }
export default function TransactionForm() {
  const { id } = useParams(), nav = useNavigate(), { transactions, categories, saveTransaction, deleteTransaction, notify, settings, goals, activeGoals, transfers, reallocations, savingsReady } = useApp()
  const existing = id ? transactions.find((t) => t.id === id) : null
  const [f, setF] = useState(() => (existing ? { ...existing, amount: String(existing.amount) } : { type: 'expense', amount: '', categoryId: '', description: '', date: TODAY, notes: '', balance: 'current', goalId: '' }))
  const [err, setErr] = useState({}), [saving, setSaving] = useState(false), [confirm, setConfirm] = useState(false), [addCat, setAddCat] = useState(false), [showNotes, setShowNotes] = useState(!!existing?.notes?.trim())
  if (id && !existing) return <ErrorState title="Transaction not found" text="It may have been deleted." />
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  // The ledger without this transaction: what each bucket holds before it is applied (so editing never counts the old version twice).
  const others = transactions.filter((t) => t.id !== existing?.id), base = computeLedger({ transactions: others, transfers, reallocations, goals })
  const goalChoices = activeGoals.concat(goals.filter((g) => g.archived && g.id === f.goalId)) // an old transaction can still point at a deleted goal
  const submit = async (e) => {
    e.preventDefault(); if (saving) return; const er = {}
    // The amount box accepts a calculation. It is worked out here by a safe parser (no eval), rounded to cents, and only the resulting number is saved.
    const calc = evaluateAmount(f.amount), amt = calc.ok ? calc.amount : 0
    if (!calc.ok) er.amount = calc.error
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
      {/* Order: what it is (type, where the money is), how much and when, then the category and optional details. The goal only appears once Savings is chosen. */}
      <Field className={savingsReady ? 'f-half' : ''} label="Type"><Segmented label="Type" value={f.type} onChange={(type) => setF({ ...f, type, categoryId: '' })} options={[['expense', 'Expense'], ['income', 'Income']]} /></Field>
      {savingsReady && <Field className="f-bal f-half" label={f.type === 'income' ? 'Add to' : 'Paid from'} info={f.balance === 'savings' ? SAVINGS_HINT[f.type] : undefined}><Segmented label={f.type === 'income' ? 'Add to' : 'Paid from'} value={f.balance} onChange={(balance) => { setF({ ...f, balance, goalId: '' }); setErr(({ goal, ...rest }) => rest) }} options={[['current', 'Current Balance'], ['savings', 'Savings']]} /></Field>}
      {savingsReady && f.balance === 'savings' && <Field className="f-goal" label="Savings goal (optional)" error={err.goal} info={goalChoices.length === 0 ? 'No goals yet, so this uses General Savings.' : f.type === 'expense' ? 'Without a goal, only unassigned Savings can be used.' : undefined}><select className="input" value={f.goalId} onChange={(e) => { set('goalId')(e); setErr(({ goal, ...rest }) => rest) }} aria-invalid={bad('goal')}><option value="">{f.type === 'expense' ? `General Savings / No specific goal (${money(base.unassigned)} unassigned)` : 'General Savings / No specific goal'}</option>{goalChoices.map((g) => <option key={g.id} value={g.id}>{g.name}{g.archived ? ' (deleted)' : ''}{f.type === 'expense' ? ` (${money(bucketAmount(base, g.id))} saved)` : ''}</option>)}</select></Field>}
      <Field className="f-amount f-half" label={`Amount (${settings.currency})`} error={err.amount} info={AMOUNT_TIP}><AmountInput value={f.amount} onChange={set('amount')} aria-invalid={bad('amount')} autoFocus={!existing} /></Field>
      <Field className="f-date f-half" label="Date" error={err.date}><input className="input" type="date" value={f.date} onChange={set('date')} aria-invalid={bad('date')} /></Field>
      <div className="field f-cat"><span className="field-label" id="tx-cat-label">Category (optional)</span>
        <CategoryPicker type={f.type} categories={categories} value={f.categoryId} onChange={(categoryId) => setF((x) => ({ ...x, categoryId }))} onAdd={() => setAddCat(true)} labelledBy="tx-cat-label" /></div>
      <Field className="f-title" label="Transaction title (optional)"><input className="input" value={f.description} onChange={set('description')} placeholder="Defaults to the category name" /></Field>
      {showNotes ? <Field label="Notes (optional)"><textarea className="input" value={f.notes} onChange={set('notes')} autoFocus={!existing?.notes?.trim()} /></Field>
        : <button type="button" className="btn-link tx-more" onClick={() => setShowNotes(true)}>Add a note</button>}
      {err.form && <p className="field-error" role="alert">{err.form}</p>}
      <div className="form-actions"><button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        <button type="button" className="btn" onClick={() => nav(-1)}>Cancel</button>
        {existing && <button type="button" className="btn btn-danger push" onClick={() => setConfirm(true)}>Delete transaction</button>}</div></form>
    {addCat && <CategoryDialog type={f.type} onClose={() => setAddCat(false)} onCreated={(c) => { setF((x) => ({ ...x, categoryId: c.id })); setAddCat(false) }} />}
    {confirm && <DeleteTransactionDialog summary={`${txLabel(existing, categories)}, ${signed(existing.amount, existing.type)}, ${formatDate(existing.date)}.`} onCancel={() => setConfirm(false)} onConfirm={async () => { const e = await deleteTransaction(existing.id); if (e) { setConfirm(false); setErr({ form: e }); return } notify('Transaction deleted.'); nav('/transactions') }} />}
  </>)
}
