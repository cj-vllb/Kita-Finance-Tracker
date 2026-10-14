import { useRef, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { ConfirmDialog, Field } from './ui.jsx'
import { money } from '../utils/format.js'
import { TODAY } from '../utils/dates.js'
import { bucketAmount, toMoney } from '../utils/ledger.js'

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

// mode: 'add' (Current Balance -> Savings), 'withdraw' (Savings -> Current Balance), 'move' (inside Savings, balances do not change).
export function MoveDialog({ mode, goalId = '', onClose }) {
  const { ledger, activeGoals, settings, addTransfer, moveSavings, notify } = useApp()
  const [f, setF] = useState({ amount: '', goal: goalId, to: '', date: TODAY, note: '' }), [err, setErr] = useState({}), busy = useRef(false), first = useRef()
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErr({}) }
  // Move: the destination can never equal the source, so a clashing value falls back to the first valid choice.
  const toValue = f.to !== f.goal ? f.to : f.goal === '' ? activeGoals[0]?.id || '' : ''
  const text = { add: ['Add to Savings', 'Add to Savings'], withdraw: ['Withdraw to Current Balance', 'Withdraw'], move: ['Move money within Savings', 'Move money'] }[mode]
  const submit = async () => {
    if (busy.current) return
    const amt = toMoney(f.amount), er = {}
    if (!f.amount || Number.isNaN(Number(f.amount))) er.amount = 'Enter an amount.'
    else if (!(amt > 0)) er.amount = 'Enter an amount above zero.'
    else if (mode === 'add' && amt > ledger.current) er.amount = `You only have ${money(ledger.current)} in Current Balance. Enter a smaller amount.`
    else if (mode !== 'add' && amt > bucketAmount(ledger, f.goal)) er.amount = `${bucketName(activeGoals, f.goal)} only holds ${money(bucketAmount(ledger, f.goal))}. Enter a smaller amount.`
    if (mode === 'move' && f.goal === toValue) er.to = 'Choose a different place to move the money to.'
    if (mode !== 'move' && !f.date) er.date = 'Choose a date.'
    setErr(er); if (Object.keys(er).length) return first.current?.querySelector('[aria-invalid="true"]')?.focus()
    busy.current = true
    const error = mode === 'move'
      ? await moveSavings({ fromGoalId: f.goal, toGoalId: toValue, amount: amt, date: TODAY, note: f.note })
      : await addTransfer({ direction: mode === 'add' ? 'to_savings' : 'to_current', amount: amt, date: f.date, note: f.note, goalId: f.goal })
    busy.current = false
    if (error) return setErr({ form: error })
    notify(mode === 'add' ? `${money(amt)} added to Savings.` : mode === 'withdraw' ? `${money(amt)} moved to Current Balance.` : `${money(amt)} moved.`)
    onClose()
  }
  return (<ConfirmDialog title={text[0]} confirmLabel={text[1]} danger={false} focusRef={first} onCancel={onClose} onConfirm={submit}>
    <div className="sv-dialog" ref={first} onKeyDown={enterSubmits(submit)}>
      <p className="muted small">{mode === 'add' ? 'Moves money you already have from Current Balance into Savings. This is not income or an expense.' : mode === 'withdraw' ? 'Moves money from Savings back to Current Balance. This is not income or an expense.' : 'Changes which goal the money is set aside for. Current Balance and Savings stay the same.'}</p>
      <Field label={`Amount (${settings.currency})`} error={err.amount} hint={mode === 'add' ? `Available in Current Balance: ${money(ledger.current)}` : undefined}>
        <input className="input" type="number" step="0.01" inputMode="decimal" placeholder="0.00" value={f.amount} onChange={set('amount')} aria-invalid={!!err.amount} autoFocus /></Field>
      <Field label={mode === 'add' ? 'Add to' : mode === 'withdraw' ? 'Withdraw from' : 'Move from'} hint={mode === 'add' ? 'Choose a goal, or keep it as General Savings.' : undefined}>
        {mode === 'add' ? <select className="input" value={f.goal} onChange={set('goal')}><GoalOptions goals={activeGoals} /></select>
          : <select className="input" value={f.goal} onChange={set('goal')}><BucketOptions goals={activeGoals} ledger={ledger} /></select>}</Field>
      {mode === 'move' && <Field label="Move to" error={err.to}><select className="input" value={toValue} onChange={set('to')} aria-invalid={!!err.to}><GoalOptions goals={activeGoals} skip={f.goal} /></select></Field>}
      {mode !== 'move' && <Field label="Date" error={err.date}><input className="input" type="date" value={f.date} onChange={set('date')} aria-invalid={!!err.date} /></Field>}
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
