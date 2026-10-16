import { useRef, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { ConfirmDialog, Field, focusFirstInvalid } from './ui.jsx'
import { money } from '../utils/format.js'
import { TODAY } from '../utils/dates.js'
import { bucketAmount, toMoney, CURRENT, GENERAL, transferDefaults, transferPlan, transferProblem, placeAmount } from '../utils/ledger.js'

// Dialogs for the Savings page. They use the same ConfirmDialog, Field and input styles as the rest of the app. Every rule that protects the
// money (enough funds, no negative goal, ownership) is enforced again by the database; the checks here only give an early, clear message.

// Enter in a text field submits, like the category dialog.
const enterSubmits = (submit) => (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); submit() } }

// One option per place money can sit inside Savings: General Savings (unassigned) or a goal. `amountWord` explains the number shown.
function BucketOptions({ goals, ledger, skip, word = 'saved' }) {
  return (<>{skip !== '' && <option value="">{`General Savings (${money(ledger.unassigned)} unassigned)`}</option>}
    {goals.filter((g) => g.id !== skip).map((g) => <option key={g.id} value={g.id}>{`${g.name} (${money(bucketAmount(ledger, g.id))} ${word})`}</option>)}</>)
}
function GoalOptions({ goals, skip }) {
  return (<>{skip !== '' && <option value="">General Savings</option>}{goals.filter((g) => g.id !== skip).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</>)
}
const bucketName = (goals, id) => (id ? goals.find((g) => g.id === id)?.name || 'that goal' : 'General Savings')

// Add money: ONE form for every movement of money. From and To can each be Current Balance, General Savings or an active goal; which database
// write that needs (transfer or reallocation) is decided by transferPlan(). Opened from a goal (or General Savings) it starts as
// Current Balance -> that place, and the person can change either side.
export function TransferDialog({ goalId = '', onClose }) {
  const { ledger, activeGoals, addTransfer, moveSavings, notify } = useApp()
  const [f, setF] = useState(() => ({ ...transferDefaults(goalId), amount: '' })), [err, setErr] = useState({}), busy = useRef(false), first = useRef()
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErr({}) }
  const label = (p) => (p === CURRENT ? 'Current Balance' : p === GENERAL ? 'General Savings' : activeGoals.find((g) => g.id === p)?.name || 'that goal')
  const submit = async () => {
    if (busy.current) return
    const problem = transferProblem(ledger, activeGoals, f, money)
    if (problem) { setErr({ [problem.field]: problem.message }); return focusFirstInvalid() }
    const amt = toMoney(f.amount), plan = transferPlan(f.from, f.to)
    busy.current = true
    const error = plan.kind === 'transfer'
      ? await addTransfer({ direction: plan.direction, amount: amt, date: TODAY, note: '', goalId: plan.goalId })
      : await moveSavings({ fromGoalId: plan.fromGoalId, toGoalId: plan.toGoalId, amount: amt, date: TODAY, note: '' })
    busy.current = false
    if (error) return setErr({ form: error })
    notify(`${money(amt)} moved from ${label(f.from)} to ${label(f.to)}.`)
    onClose()
  }
  const places = (<><option value={CURRENT}>{`Current Balance (${money(ledger.current)})`}</option><option value={GENERAL}>{`General Savings (${money(ledger.unassigned)})`}</option>
    {activeGoals.map((g) => <option key={g.id} value={g.id}>{`${g.name} (${money(bucketAmount(ledger, g.id))})`}</option>)}</>)
  return (<ConfirmDialog title="Move money" confirmLabel="Transfer" danger={false} focusRef={first} onCancel={onClose} onConfirm={submit}>
    <div className="sv-dialog" ref={first} onKeyDown={enterSubmits(submit)}>
      <p className="muted small">Moves money you already have between your balances and goals. This is not income or an expense.</p>
      <Field label="From" error={err.from} hint={`Available: ${money(Math.max(0, placeAmount(ledger, f.from)))}`}><select className="input" value={f.from} onChange={set('from')} aria-invalid={!!err.from} autoFocus>{places}</select></Field>
      <Field label="To" error={err.to} hint={`Currently holds: ${money(placeAmount(ledger, f.to))}`}><select className="input" value={f.to} onChange={set('to')} aria-invalid={!!err.to}>{places}</select></Field>
      <Field label="Amount" error={err.amount}><input className="input" type="number" step="0.01" inputMode="decimal" placeholder="0.00" value={f.amount} onChange={set('amount')} aria-invalid={!!err.amount} /></Field>
      {err.form && <p className="field-error" role="alert">{err.form}</p>}
    </div></ConfirmDialog>)
}

// Withdraw: Savings (General or one goal) -> Current Balance.
export function WithdrawDialog({ goalId = '', onClose }) {
  const { ledger, activeGoals, settings, addTransfer, notify } = useApp()
  const [f, setF] = useState({ amount: '', goal: goalId, date: TODAY, note: '' }), [err, setErr] = useState({}), busy = useRef(false), first = useRef()
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErr({}) }
  const submit = async () => {
    if (busy.current) return
    const amt = toMoney(f.amount), er = {}
    if (!f.amount || !Number.isFinite(Number(f.amount))) er.amount = 'Enter an amount.'
    else if (!(amt > 0)) er.amount = 'Enter an amount above zero.'
    else if (amt > bucketAmount(ledger, f.goal)) er.amount = `${bucketName(activeGoals, f.goal)} only holds ${money(bucketAmount(ledger, f.goal))}. Enter a smaller amount.`
    if (!f.date) er.date = 'Choose a date.'
    setErr(er); if (Object.keys(er).length) return first.current?.querySelector('[aria-invalid="true"]')?.focus()
    busy.current = true
    const error = await addTransfer({ direction: 'to_current', amount: amt, date: f.date, note: f.note, goalId: f.goal })
    busy.current = false
    if (error) return setErr({ form: error })
    notify(`${money(amt)} moved to Current Balance.`)
    onClose()
  }
  return (<ConfirmDialog title="Withdraw to Current Balance" confirmLabel="Withdraw" danger={false} focusRef={first} onCancel={onClose} onConfirm={submit}>
    <div className="sv-dialog" ref={first} onKeyDown={enterSubmits(submit)}>
      <p className="muted small">Moves money from Savings back to Current Balance. This is not income or an expense.</p>
      <Field label={`Amount (${settings.currency})`} error={err.amount}>
        <input className="input" type="number" step="0.01" inputMode="decimal" placeholder="0.00" value={f.amount} onChange={set('amount')} aria-invalid={!!err.amount} autoFocus /></Field>
      <Field label="Withdraw from"><select className="input" value={f.goal} onChange={set('goal')}><BucketOptions goals={activeGoals} ledger={ledger} /></select></Field>
      <Field label="Date" error={err.date}><input className="input" type="date" value={f.date} onChange={set('date')} aria-invalid={!!err.date} /></Field>
      <Field label="Note (optional)"><input className="input" maxLength={120} value={f.note} onChange={set('note')} autoComplete="off" /></Field>
      {err.form && <p className="field-error" role="alert">{err.form}</p>}
    </div></ConfirmDialog>)
}

export function GoalDialog({ goal, onClose }) {
  const { activeGoals, settings, saveGoal, notify } = useApp()
  const [f, setF] = useState({ name: goal?.name || '', target: goal ? String(goal.target) : '' }), [err, setErr] = useState({}), busy = useRef(false), first = useRef()
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErr({}) }
  const submit = async () => {
    if (busy.current) return
    const name = f.name.trim(), target = toMoney(f.target), er = {}
    if (!name) er.name = 'Enter a name for this goal.'
    else if (activeGoals.some((g) => g.id !== goal?.id && g.name.trim().toLowerCase() === name.toLowerCase())) er.name = 'You already have a goal with that name.'
    if (!f.target || Number.isNaN(Number(f.target))) er.target = 'Enter a target amount.'
    else if (!(target > 0)) er.target = 'The target must be above zero.'
    setErr(er); if (Object.keys(er).length) return first.current?.querySelector('[aria-invalid="true"]')?.focus()
    busy.current = true
    const error = await saveGoal({ id: goal?.id || 'new', name, target })
    busy.current = false
    if (error) return setErr({ form: error })
    notify(goal ? 'Goal updated.' : 'Goal created.'); onClose()
  }
  return (<ConfirmDialog title={goal ? 'Edit goal' : 'New goal'} confirmLabel={goal ? 'Save goal' : 'Create goal'} danger={false} focusRef={first} onCancel={onClose} onConfirm={submit}>
    <div className="sv-dialog" ref={first} onKeyDown={enterSubmits(submit)}>
      <Field label="Goal name" error={err.name}><input className="input" maxLength={60} value={f.name} onChange={set('name')} aria-invalid={!!err.name} autoComplete="off" autoFocus /></Field>
      <Field label={`Target amount (${settings.currency})`} error={err.target} hint={goal ? 'Changing the target does not move any money.' : 'Creating a goal does not move any money. You choose what to set aside for it afterwards.'}>
        <input className="input" type="number" step="0.01" inputMode="decimal" placeholder="0.00" value={f.target} onChange={set('target')} aria-invalid={!!err.target} /></Field>
      {err.form && <p className="field-error" role="alert">{err.form}</p>}
    </div></ConfirmDialog>)
}

// A goal is never wiped with its money: whatever it holds is first moved to General Savings or another goal, in one step. History stays.
export function DeleteGoalDialog({ goal, onClose }) {
  const { ledger, activeGoals, deleteGoal, notify } = useApp(), saved = bucketAmount(ledger, goal.id), [to, setTo] = useState(''), [err, setErr] = useState(null)
  const submit = async () => {
    const error = await deleteGoal(goal.id, to, TODAY)
    if (error) return setErr(error)
    notify('Goal deleted.'); onClose()
  }
  return (<ConfirmDialog title="Delete goal?" confirmLabel="Delete goal" onCancel={onClose} onConfirm={submit}>
    <p><strong>{goal.name}</strong></p>
    {saved > 0 ? <>
      <p>This goal holds {money(saved)}. That money stays in your Savings. Choose where it should be set aside instead.</p>
      <Field label="Move the saved money to"><select className="input" value={to} onChange={(e) => setTo(e.target.value)}><GoalOptions goals={activeGoals} skip={goal.id} /></select></Field></>
      : <p className="muted">This goal holds no money. It will be removed from your list.</p>}
    <p className="muted small">Current Balance and your total Savings do not change, and past activity stays in your history.</p>
    {err && <p className="field-error" role="alert">{err}</p>}
  </ConfirmDialog>)
}

// Undo a transfer or a reallocation. The database refuses it if the money has since been spent or moved on, and says why.
export function UndoDialog({ entry, summary, onClose }) {
  const { undoSavingsActivity, notify } = useApp(), [err, setErr] = useState(null)
  const submit = async () => {
    const error = await undoSavingsActivity(entry.kind, entry.id)
    if (error) return setErr(error)
    notify(entry.kind === 'transfer' ? 'Transfer undone.' : 'Move undone.'); onClose()
  }
  return (<ConfirmDialog title={entry.kind === 'transfer' ? 'Undo this transfer?' : 'Undo this move?'} confirmLabel="Undo" onCancel={onClose} onConfirm={submit}>
    <p className="muted">{summary}</p>
    <p>{entry.kind === 'transfer' ? 'The money goes back where it came from.' : 'The money goes back to where it was set aside before.'} If it has already been spent or moved on, this will not be allowed.</p>
    {err && <p className="field-error" role="alert">{err}</p>}
  </ConfirmDialog>)
}
