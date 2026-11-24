import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Receipt, ArrowLeftRight, PiggyBank, ArrowRight } from 'lucide-react'
import { InfoTip } from './ui.jsx'
import { useApp } from '../context/AppContext.jsx'
import { Modal, Field, Presence, focusFirstInvalid } from './ui.jsx'
import { DateField } from './Pickers.jsx'
import AmountPad from './AmountPad.jsx'
import CategoryPicker from './CategoryPicker.jsx'
import CategoryDialog from './CategoryDialog.jsx'
import { localToday } from '../utils/dateRange.js'
import { money } from '../utils/format.js'
import { CURRENT, GENERAL, transferDefaults, placeAmount } from '../utils/ledger.js'
import { quickTransaction, quickSavings, quickTransfer, SAVINGS_MODES, placeName } from '../utils/quickEntry.js'

// PHONE AND TABLET ONLY (AppShell mounts these only at 1100px and below). The desktop keeps its own pages and dialogs.
// The central "+" opens a small menu with three separate actions. Each action opens its OWN sheet and every sheet saves through the SAME
// functions the desktop uses (saveTransaction, addContribution, addTransfer, moveSavings), so balances, reports and history cannot differ.

export const QUICK_ACTIONS = [
  { id: 'transaction', label: 'Add Transaction', short: 'Transaction', icon: Receipt },
  { id: 'transfer', label: 'Transfer Money', short: 'Transfer', icon: ArrowLeftRight, needsSavings: true },
  { id: 'savings', label: 'Add Savings', short: 'Savings', icon: PiggyBank, needsSavings: true },
]

// The round "+" in the middle of the navigation. It turns into a close control while the menu is open.
export const QuickButton = forwardRef(function QuickButton({ open, onToggle }, ref) {
  return (<div className="qa-slot"><button ref={ref} type="button" className={'qa-btn' + (open ? ' open' : '')} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? 'quick-menu' : undefined} aria-label={open ? 'Close add menu' : 'Add'} onClick={onToggle}>
    <Plus size={24} strokeWidth={2.25} aria-hidden="true" /></button></div>)
})

// Radial menu: the three actions fan out along the top half of a circle centred on the "+" (above the bar on phones, to the right of the rail on tablets),
// emerging from the button with a short stagger. It closes on a choice, an outside tap, Escape or the "+" itself. Motion is switched off for reduced-motion users (v137.css).
// The circle is centred a little beyond the "+" (shift) so the side buttons clear the bar; every button still starts at the "+" and travels out to its place.
const FAN = { top: { angles: [150, 90, 30], radius: 112, shift: [0, -52] }, side: { angles: [60, 0, -60], radius: 104, shift: [52, 0] } } // degrees: 0 = right, 90 = up
export function QuickMenu({ show, anchor, side, onPick, onClose, savingsReady }) {
  const ref = useRef(), [c, setC] = useState(null)
  useLayoutEffect(() => { if (show && anchor.current) { const r = anchor.current.getBoundingClientRect(); setC({ x: r.left + r.width / 2, y: r.top + r.height / 2 }) } }, [show, anchor, side])
  useEffect(() => {
    if (!show) return
    const esc = (e) => { if (e.key === 'Escape') { e.preventDefault(); onClose(true) } }, out = (e) => { if (!ref.current?.contains(e.target) && !anchor.current?.contains(e.target)) onClose() }
    document.addEventListener('keydown', esc); document.addEventListener('pointerdown', out); window.addEventListener('resize', onClose)
    return () => { document.removeEventListener('keydown', esc); document.removeEventListener('pointerdown', out); window.removeEventListener('resize', onClose) }
  }, [show, onClose, anchor])
  useEffect(() => { if (show && c) ref.current?.querySelector('[role="menuitem"]')?.focus({ preventScroll: true }) }, [show, !!c]) // eslint-disable-line react-hooks/exhaustive-deps
  const onKey = (e) => {
    const list = [...ref.current.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])')], i = list.indexOf(document.activeElement), go = (n) => { e.preventDefault(); list[n]?.focus() }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') go(i >= list.length - 1 ? 0 : i + 1); else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') go(i <= 0 ? list.length - 1 : i - 1); else if (e.key === 'Home') go(0); else if (e.key === 'End') go(list.length - 1); else if (e.key === 'Tab') onClose()
  }
  const { angles, radius, shift } = FAN[side]
  return createPortal(<Presence show={show}>{(state) => (<>
    <div className={'qa-scrim ' + side} data-state={state} aria-hidden="true" onClick={() => onClose()} />
    <div ref={ref} id="quick-menu" className={'qa-fan ' + side} data-state={state} role="menu" aria-label="Add" onKeyDown={onKey} style={c ? { left: c.x + shift[0], top: c.y + shift[1], '--r': radius + 'px', '--sx': -shift[0] + 'px', '--sy': -shift[1] + 'px' } : { visibility: 'hidden' }}>
      <span className="qa-ring" aria-hidden="true" />
      {QUICK_ACTIONS.map(({ id, label, short, icon: Icon, needsSavings }, i) => { const off = needsSavings && !savingsReady, rad = (angles[i] * Math.PI) / 180
        return (<button key={id} type="button" role="menuitem" className="qa-fab" aria-label={off ? `${label} (needs the latest database update)` : label} aria-disabled={off || undefined}
          style={{ '--x': Math.round(Math.cos(rad) * radius) + 'px', '--y': Math.round(-Math.sin(rad) * radius) + 'px', '--i': i }} onClick={() => !off && onPick(id)}>
          <span className="qa-fab-ico"><Icon size={22} strokeWidth={1.9} aria-hidden="true" /></span><span className="qa-fab-label">{short}</span></button>) })}
    </div></>)}</Presence>, document.body)
}

// ---------- shared sheet pieces ----------
// <Field> hands id and aria-describedby to its control, which links the visible label to it (so no extra aria-label is needed).
const Select = ({ id, value, onChange, children, invalid, 'aria-describedby': describedBy }) => <select id={id} className="input" value={value} onChange={onChange} aria-invalid={invalid} aria-describedby={describedBy}>{children}</select>
// One footer for every sheet: Cancel and the primary action. `busy` blocks a second tap while the save is in flight.
function SheetFooter({ dismiss, label, busy, onSubmit, disabled }) {
  return (<><button type="button" className="btn" onClick={dismiss}>Cancel</button><button type="button" className="btn btn-primary" disabled={busy || disabled} onClick={onSubmit}>{busy ? 'Saving...' : label}</button></>)
}
// Category choice for a type, with the same "add a category" tile the full form has.
const CategoryField = ({ type, categories, value, onChange, onAdd }) => (<div className="field"><span className="field-label" id="qs-cat-label">Category <span className="muted">(optional)</span></span>
  <CategoryPicker type={type} categories={categories} value={value} onChange={onChange} onAdd={onAdd} labelledBy="qs-cat-label" /></div>)
// Enter submits from single-line fields, like the other dialogs.
const enter = (submit) => (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && !e.target.classList.contains('ap-input')) { e.preventDefault(); submit() } }

// ---------- Add Transaction ----------
export function TransactionSheet({ onClose }) {
  const { activeCategories, saveTransaction, notify } = useApp()
  const [f, setF] = useState(() => ({ type: 'expense', date: localToday(), amount: '', categoryId: '', description: '', notes: '' })), [err, setErr] = useState({}), [busy, setBusy] = useState(false), [note, setNote] = useState(false), [addCat, setAddCat] = useState(false), lock = useRef(false)
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setErr((e) => { const { [k === 'description' ? 'title' : k === 'notes' ? 'note' : k]: _, form, ...rest } = e; return rest }) }
  const submit = async () => {
    if (lock.current) return
    const r = quickTransaction(f); if (!r.ok) { setErr(r.errors); return focusFirstInvalid() }
    lock.current = true; setBusy(true)
    const error = await saveTransaction(r.row)
    lock.current = false; setBusy(false)
    if (error) return setErr({ form: error })
    notify('Transaction saved successfully.'); onClose()
  }
  // Adding a category replaces the sheet for a moment (the choices below are kept in this component's state), so there are never two dialogs stacked.
  if (addCat) return <CategoryDialog type={f.type} onClose={() => setAddCat(false)} onCreated={(c) => { set('categoryId', c.id); setAddCat(false) }} />
  return (<Modal title="Add transaction" className="qs" wide labelledBy="qs-title" onClose={onClose} footer={(dismiss) => <SheetFooter dismiss={dismiss} label="Save" busy={busy} onSubmit={submit} />}>
    <div className="qs-form" onKeyDown={enter(submit)}>
      <div className="qs-row">
        <Field label="Type"><Select value={f.type} onChange={(e) => { setF((x) => ({ ...x, type: e.target.value, categoryId: '' })) }}><option value="expense">Expense</option><option value="income">Income</option></Select></Field>
        <Field label="Date" error={err.date}><DateField value={f.date} onChange={(d) => set('date', d)} aria-invalid={!!err.date} /></Field></div>
      <Field label="Amount" error={err.amount}><AmountPad value={f.amount} onChange={(v) => set('amount', v)} aria-invalid={!!err.amount} /></Field>
      <CategoryField type={f.type} categories={activeCategories} value={f.categoryId} onChange={(id) => set('categoryId', id)} onAdd={() => setAddCat(true)} />
      <Field label="Transaction title" error={err.title}><input className="input" value={f.description} maxLength={120} onChange={(e) => set('description', e.target.value)} placeholder="Defaults to the category name" autoComplete="off" /></Field>
      {note ? <Field label="Note" error={err.note}><textarea className="input qs-note" rows={2} value={f.notes} maxLength={1000} onChange={(e) => set('notes', e.target.value)} autoFocus /></Field> : null}
      <button type="button" className="btn-link qs-notebtn" aria-expanded={note} onClick={() => setNote((n) => !n)}>{note ? '− Hide note' : '+ Add Note'}</button>
      {err.form && <p className="field-error" role="alert">{err.form}</p>}
    </div></Modal>)
}

// ---------- Add Savings ----------
// Add Money = income in Savings, Remove Money = expense from Savings (see utils/quickEntry.js). Neither touches Current Balance. Both are saved as one ordinary
// transaction through saveTransaction, exactly like the full form does for a Savings income/expense.
export function SavingsSheet({ onClose }) {
  const { ledger, activeCategories, saveTransaction, notify } = useApp()
  const [f, setF] = useState(() => ({ mode: 'add', date: localToday(), amount: '', categoryId: '', title: '', notes: '' })), [err, setErr] = useState({}), [busy, setBusy] = useState(false), [note, setNote] = useState(false), [addCat, setAddCat] = useState(false), lock = useRef(false)
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setErr({}) }
  const m = SAVINGS_MODES[f.mode]
  const submit = async () => {
    if (lock.current) return
    const r = quickSavings({ ...f, ledger }, money); if (!r.ok) { setErr(r.errors); return focusFirstInvalid() }
    lock.current = true; setBusy(true)
    const error = await saveTransaction(r.row)
    lock.current = false; setBusy(false)
    if (error) return setErr({ form: error })
    notify(f.mode === 'add' ? `${money(r.row.amount)} added to Savings.` : `${money(r.row.amount)} removed from Savings.`); onClose()
  }
  if (addCat) return <CategoryDialog type={m.type} onClose={() => setAddCat(false)} onCreated={(c) => { set('categoryId', c.id); setAddCat(false) }} />
  return (<Modal title={<>Add savings <InfoTip label="About adding savings">{m.tip}</InfoTip></>} className="qs" wide labelledBy="qs-title" onClose={onClose} footer={(dismiss) => <SheetFooter dismiss={dismiss} label={f.mode === 'add' ? 'Add' : 'Remove'} busy={busy} onSubmit={submit} />}>
    <div className="qs-form" onKeyDown={enter(submit)}>
      <div className="qs-row qs-row-sv">
        <Field label="Type"><Select value={f.mode} onChange={(e) => setF((x) => ({ ...x, mode: e.target.value, categoryId: '' }))}><option value="add">Add Money</option><option value="remove">Remove Money</option></Select></Field>
        <Field label="Date" error={err.date}><DateField value={f.date} onChange={(d) => set('date', d)} aria-invalid={!!err.date} /></Field></div>
      <Field label="Amount" error={err.amount}><AmountPad value={f.amount} onChange={(v) => set('amount', v)} aria-invalid={!!err.amount} /></Field>
      <CategoryField type={m.type} categories={activeCategories} value={f.categoryId} onChange={(id) => set('categoryId', id)} onAdd={() => setAddCat(true)} />
      <Field label="Title" error={err.title}><input className="input" value={f.title} maxLength={120} onChange={(e) => set('title', e.target.value)} placeholder="Optional" autoComplete="off" /></Field>
      {note ? <Field label="Note" error={err.note}><textarea className="input qs-note" rows={2} value={f.notes} maxLength={1000} onChange={(e) => set('notes', e.target.value)} autoFocus /></Field> : null}
      <button type="button" className="btn-link qs-notebtn" aria-expanded={note} onClick={() => setNote((n) => !n)}>{note ? '− Hide note' : '+ Add Note'}</button>
      {err.form && <p className="field-error" role="alert">{err.form}</p>}
    </div></Modal>)
}

// ---------- Transfer Money ----------
export function TransferSheet({ onClose }) {
  const { ledger, activeGoals, addTransfer, moveSavings, notify } = useApp()
  const [f, setF] = useState(() => ({ ...transferDefaults(''), date: localToday(), amount: '', title: '' })), [err, setErr] = useState({}), [busy, setBusy] = useState(false), lock = useRef(false)
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setErr({}) }
  const place = (p) => placeName(p, activeGoals) // names only, so the drop-downs stay readable in a half-width column; amounts are in the hints below
  const options = (other) => (<><option value={CURRENT} disabled={other === CURRENT}>{place(CURRENT)}</option><option value={GENERAL} disabled={other === GENERAL}>{place(GENERAL)}</option>{activeGoals.map((g) => <option key={g.id} value={g.id} disabled={other === g.id}>{place(g.id)}</option>)}</>)
  const submit = async () => {
    if (lock.current) return
    const r = quickTransfer({ ...f, ledger, activeGoals }, money); if (!r.ok) { setErr(r.errors); return focusFirstInvalid() }
    lock.current = true; setBusy(true)
    const error = r.kind === 'transfer' ? await addTransfer(r.payload) : await moveSavings(r.payload)
    lock.current = false; setBusy(false)
    if (error) return setErr({ form: error })
    notify(`${money(r.payload.amount)} moved from ${placeName(f.from, activeGoals)} to ${placeName(f.to, activeGoals)}.`); onClose()
  }
  return (<Modal title="Transfer money" className="qs" wide labelledBy="qs-title" onClose={onClose} footer={(dismiss) => <SheetFooter dismiss={dismiss} label="Transfer" busy={busy} onSubmit={submit} />}>
    <div className="qs-form" onKeyDown={enter(submit)}>
      <div className="qs-row qs-ft">
        <Field label="From" error={err.from} hint={`Available: ${money(Math.max(0, placeAmount(ledger, f.from)))}`}><Select value={f.from} onChange={(e) => set('from', e.target.value)} invalid={!!err.from}>{options(f.to)}</Select></Field>
        <span className="qs-arrow" aria-hidden="true"><ArrowRight size={16} /></span>
        <Field label="To" error={err.to} hint={`Currently holds: ${money(placeAmount(ledger, f.to))}`}><Select value={f.to} onChange={(e) => set('to', e.target.value)} invalid={!!err.to}>{options(f.from)}</Select></Field></div>
      <Field label="Date" error={err.date}><DateField value={f.date} onChange={(d) => set('date', d)} aria-invalid={!!err.date} /></Field>
      <Field label="Amount" error={err.amount}><AmountPad value={f.amount} onChange={(v) => set('amount', v)} aria-invalid={!!err.amount} /></Field>
      <Field label="Title" error={err.title}><input className="input" value={f.title} maxLength={120} onChange={(e) => set('title', e.target.value)} placeholder="Optional" autoComplete="off" /></Field>
      {err.form && <p className="field-error" role="alert">{err.form}</p>}
    </div></Modal>)
}
export const SHEETS = { transaction: TransactionSheet, savings: SavingsSheet, transfer: TransferSheet }
