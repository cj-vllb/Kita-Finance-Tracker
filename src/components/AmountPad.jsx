import { useRef, useState } from 'react'
import { Delete, Check } from 'lucide-react'
import { pressKey, evaluateKeypad, display, sanitizeTyped, settle } from '../utils/amountKeypad.js'
import { evaluateAmount } from '../utils/expression.js'
import { money } from '../utils/format.js'
import { currencyPrefix } from '../utils/currency.js'
import { getCurrency } from '../utils/format.js'

// Amount entry for the phone/tablet sheets: a large display plus a compact keypad that can only produce digits, one decimal point per number and
// + - × ÷. The value is the same text expression the desktop form accepts ("100+25.5"), evaluated by the same safe parser (utils/expression.js), so
// the stored amount is a plain number with at most two decimals. The display is a real text input with inputMode="none": the phone's own keyboard
// does not open over the form, but a connected keyboard still works, and anything typed is cleaned to the same allowed characters.
// `id` and `aria-describedby` come from <Field>.
const ROWS = [['clear', '÷', '×', 'back'], ['7', '8', '9', '-'], ['4', '5', '6', '+'], ['1', '2', '3', 'equals'], ['0', '.', 'done']]
const KEY = { '÷': '/', '×': '*' }
const LABEL = { clear: 'Clear', back: 'Delete', equals: 'Calculate', done: 'Done', '-': 'Minus', '+': 'Plus', '÷': 'Divide', '×': 'Multiply', '.': 'Decimal point' }
export default function AmountPad({ value, onChange, id, 'aria-describedby': describedBy, 'aria-invalid': invalid, label = 'Amount', startOpen = true }) {
  const [open, setOpen] = useState(startOpen), input = useRef()
  const calc = evaluateKeypad(value), result = calc.ok && calc.isExpression ? money(calc.amount) : null, prefix = currencyPrefix(getCurrency())
  const press = (k) => {
    if (k === 'done') { setOpen(false); return input.current?.blur() }
    if (k === 'equals') { const r = evaluateAmount(settle(value)); if (r.ok) onChange(String(r.amount)); return }
    onChange(pressKey(value, KEY[k] || k))
  }
  return (<div className={'ap' + (invalid ? ' bad' : '')}>
    <div className="ap-display" onClick={() => { setOpen(true); input.current?.focus({ preventScroll: true }) }}>
      <span className="ap-cur" aria-hidden="true">{prefix}</span>
      <input ref={input} id={id} className="ap-input" type="text" inputMode="none" autoComplete="off" spellCheck={false} placeholder="0.00" aria-label={label} aria-describedby={describedBy} aria-invalid={invalid}
        value={display(value)} onChange={(e) => onChange(sanitizeTyped(e.target.value))} onFocus={() => setOpen(true)} />
      {result && <span className="ap-result" role="status" aria-label={`Result ${result}`}>= {result}</span>}</div>
    {open && <div className="ap-pad" role="group" aria-label="Amount keypad" onPointerDown={(e) => e.preventDefault() /* keeps focus: a key press never closes or reopens anything */}>
      {ROWS.map((row, r) => <div className="ap-row" key={r}>{row.map((k) => (
        <button key={k} type="button" className={'ap-key' + (/^[0-9.]$/.test(k) ? '' : ' op') + (k === 'done' ? ' done' : '') + (k === '0' ? ' zero' : '')} aria-label={LABEL[k] || k} onClick={() => press(k)}>
          {k === 'back' ? <Delete size={20} aria-hidden="true" /> : k === 'done' ? <Check size={22} strokeWidth={2.25} aria-hidden="true" /> : k === 'clear' ? 'C' : k === 'equals' ? '=' : k === '-' ? '−' : k}</button>))}</div>)}</div>}
  </div>)
}
